import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { decodeJwt, signingInputFromSegments, assembleToken, JwtFormatError } from '../core/jwt/decode';
import { base64UrlEncode } from '../core/jwt/base64url';
import { algorithms, type KeyMaterial } from '../core/jwt/algorithms';
import { useDebounce } from './useDebounce';
import { lengthBucket, shorten, track, trackThrottled } from '../core/analytics';

/**
 * Own-property lookup: `alg` comes from user-supplied JSON, so a plain
 * `algorithms[alg]` would resolve inherited members — `{"alg":"toString"}`
 * yields a truthy non-handler and blows up the verify path below.
 */
function lookupAlg(alg: string | undefined) {
  return alg && Object.hasOwn(algorithms, alg) ? algorithms[alg] : undefined;
}

// Where a change came from: verify-as-is (paste / decoder key edit) vs re-sign (content edit / encoder key edit).
type EditOrigin = 'paste' | 'content' | 'key';

interface State {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  headerSegment: string; // raw on paste, canonical re-encode on content edit
  payloadSegment: string;
  signature: string;
  keyMaterial: KeyMaterial;
  parseError: string | null;
  lastEdit: EditOrigin;
}

type Action =
  | { type: 'SET_TOKEN'; token: string }
  | { type: 'CLEAR' }
  | { type: 'SET_HEADER'; header: Record<string, unknown> }
  | { type: 'SET_PAYLOAD'; payload: Record<string, unknown> }
  | { type: 'SET_ALG'; alg: string }
  | { type: 'SET_KEY_MATERIAL'; keyMaterial: KeyMaterial; origin: 'verify' | 'sign' }
  | { type: 'SET_SIGNED'; headerSegment: string; payloadSegment: string; signature: string };

const initialHeader = { alg: 'HS256', typ: 'JWT' };
const initialPayload = { sub: '1234567890', name: 'John Doe', iat: 1516239022 };

/** Canonical re-encode — only for freshly-authored content. */
function encodeSegment(value: Record<string, unknown>): string {
  return base64UrlEncode(JSON.stringify(value));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_TOKEN': {
      try {
        const { header, payload, headerSegment, payloadSegment, signature } = decodeJwt(action.token);
        // keep original bytes untouched — needed for tamper detection
        return {
          ...state,
          header,
          payload,
          headerSegment,
          payloadSegment,
          signature,
          parseError: null,
          lastEdit: 'paste',
        };
      } catch (err) {
        return {
          ...state,
          parseError: err instanceof JwtFormatError ? err.message : 'Invalid token',
        };
      }
    }
    case 'CLEAR':
      return {
        ...state,
        header: {},
        payload: {},
        headerSegment: '',
        payloadSegment: '',
        signature: '',
        parseError: null,
        lastEdit: 'paste',
      };
    case 'SET_HEADER':
      return {
        ...state,
        header: action.header,
        headerSegment: encodeSegment(action.header),
        parseError: null,
        lastEdit: 'content',
      };
    case 'SET_PAYLOAD':
      return {
        ...state,
        payload: action.payload,
        payloadSegment: encodeSegment(action.payload),
        parseError: null,
        lastEdit: 'content',
      };
    case 'SET_ALG': {
      // alg switch is authoring -> re-sign
      const header = { ...state.header, alg: action.alg };
      return { ...state, header, headerSegment: encodeSegment(header), lastEdit: 'content' };
    }
    case 'SET_KEY_MATERIAL':
      // decoder verifies existing signature; encoder re-signs
      return { ...state, keyMaterial: action.keyMaterial, lastEdit: action.origin === 'sign' ? 'content' : 'key' };
    case 'SET_SIGNED':
      // segments jose actually produced, after a deliberate re-sign
      return {
        ...state,
        headerSegment: action.headerSegment,
        payloadSegment: action.payloadSegment,
        signature: action.signature,
      };
    default:
      return state;
  }
}

export interface VerifyState {
  status: 'idle' | 'checking' | 'valid' | 'invalid' | 'unsupported-alg';
  message?: string;
}

export type UseJwtReturn = ReturnType<typeof useJwt>;

export function useJwt() {
  const [state, dispatch] = useReducer(reducer, {
    header: initialHeader,
    payload: initialPayload,
    headerSegment: encodeSegment(initialHeader),
    payloadSegment: encodeSegment(initialPayload),
    signature: '',
    keyMaterial: { secret: 'your-256-bit-secret' },
    parseError: null,
    lastEdit: 'content',
  });

  // built from tracked segments, not re-derived JSON, so pasted bytes are shown/verified as-is
  const token = useMemo(() => {
    if (!state.headerSegment && !state.payloadSegment && !state.signature) return '';
    return assembleToken(signingInputFromSegments(state.headerSegment, state.payloadSegment), state.signature);
  }, [state.headerSegment, state.payloadSegment, state.signature]);

  // Memoize the inputs object so we don't recreate a fresh reference on every render.
  const inputsToDebounce = useMemo(() => ({
    header: state.header,
    payload: state.payload,
    headerSegment: state.headerSegment,
    payloadSegment: state.payloadSegment,
    keyMaterial: state.keyMaterial,
    signature: state.signature,
    lastEdit: state.lastEdit,
  }), [state.header, state.payload, state.headerSegment, state.payloadSegment, state.keyMaterial, state.signature, state.lastEdit]);

  // Debounce only the crypto path — decode/encode above stays instant.
  const debouncedInputs = useDebounce(inputsToDebounce, 250);

  // Immediate, un-debounced — only for keyInputType (instant field swap on alg change).
  const alg = state.header.alg as string | undefined;
  const handler = lookupAlg(alg);

  const [verify, setVerify] = useReducer(
    (_prev: VerifyState, next: VerifyState) => next,
    { status: 'idle' } as VerifyState
  );

  // Parse failures are a first-class funnel signal: someone pasted something that isn't a JWT.
  useEffect(() => {
    if (state.parseError) track('token_parse_error', { reason: shorten(state.parseError) });
  }, [state.parseError]);

  useEffect(() => {
    let cancelled = false;

    // empty token: nothing to check
    if (!debouncedInputs.headerSegment && !debouncedInputs.payloadSegment) {
      setVerify({ status: 'idle' });
      return;
    }

    // derive alg/handler from the debounced snapshot, not the immediate `alg` above, to avoid signing with a stale header mid-switch
    const debouncedAlg = debouncedInputs.header.alg as string | undefined;
    const debouncedHandler = lookupAlg(debouncedAlg);
    const mode = debouncedInputs.lastEdit === 'content' ? 'sign' : 'verify';
    // Only ever report a known registry name — an alg from a pasted token is arbitrary user input.
    const reportedAlg = debouncedHandler ? debouncedAlg : 'unsupported';

    if (!debouncedHandler) {
      setVerify({
        status: 'unsupported-alg',
        message: debouncedAlg ? `Unknown algorithm: ${debouncedAlg}` : 'No algorithm specified',
      });
      track('verify_result', { result: 'unsupported_alg', mode, has_alg: !!debouncedAlg });
      return;
    }
    setVerify({ status: 'checking' });

    const report = (result: string, reason?: string) =>
      track('verify_result', {
        result,
        mode,
        alg: reportedAlg,
        reason: reason ? shorten(reason) : undefined,
      });

    if (debouncedInputs.lastEdit === 'content') {
      // authoring: re-sign, then store the segments jose actually produced
      debouncedHandler
        .sign(debouncedInputs.header, debouncedInputs.payload, debouncedInputs.keyMaterial)
        .then(async (signedToken) => {
          if (cancelled) return;
          const [headerSegment, payloadSegment, signature] = signedToken.split('.');
          dispatch({ type: 'SET_SIGNED', headerSegment, payloadSegment, signature });
          const result = await debouncedHandler.verify(signedToken, debouncedInputs.keyMaterial);
          if (!cancelled) {
            setVerify(result.valid ? { status: 'valid' } : { status: 'invalid', message: result.error });
            report(result.valid ? 'valid' : 'invalid', result.error);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            const message = err instanceof Error ? err.message : 'Signing failed';
            setVerify({ status: 'invalid', message });
            report('sign_error', message);
          }
        });
    } else {
      // paste / key change: verify existing segments as-is (the tamper check)
      const signingInput = signingInputFromSegments(debouncedInputs.headerSegment, debouncedInputs.payloadSegment);
      const currentToken = assembleToken(signingInput, debouncedInputs.signature);
      debouncedHandler
        .verify(currentToken, debouncedInputs.keyMaterial)
        .then((result) => {
          if (!cancelled) {
            setVerify(result.valid ? { status: 'valid' } : { status: 'invalid', message: result.error });
            report(result.valid ? 'valid' : 'invalid', result.error);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            const message = err instanceof Error ? err.message : 'Verification failed';
            setVerify({ status: 'invalid', message });
            report('verify_error', message);
          }
        });
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedInputs]);

  // Typing-driven callbacks report shape only (bucketed length, segment count) and are throttled
  // so a burst of keystrokes becomes one signal rather than one event per character.
  const setToken = useCallback((t: string) => {
    trackThrottled('token_input', {
      length: lengthBucket(t.length),
      segments: t.length ? t.split('.').length : 0,
    });
    dispatch({ type: 'SET_TOKEN', token: t });
  }, []);
  const clearToken = useCallback(() => {
    track('token_cleared');
    dispatch({ type: 'CLEAR' });
  }, []);
  const setHeader = useCallback((h: Record<string, unknown>) => {
    trackThrottled('json_edited', { pane: 'header' }, 3000, 'json_edited:header');
    dispatch({ type: 'SET_HEADER', header: h });
  }, []);
  const setPayload = useCallback((p: Record<string, unknown>) => {
    trackThrottled('json_edited', { pane: 'payload' }, 3000, 'json_edited:payload');
    dispatch({ type: 'SET_PAYLOAD', payload: p });
  }, []);
  const setAlg = useCallback((a: string) => {
    track('alg_changed', { alg: Object.hasOwn(algorithms, a) ? a : 'unsupported' });
    dispatch({ type: 'SET_ALG', alg: a });
  }, []);
  // decoder: verify existing signature against new key
  const setKeyMaterial = useCallback(
    (k: KeyMaterial) => dispatch({ type: 'SET_KEY_MATERIAL', keyMaterial: k, origin: 'verify' }),
    []
  );
  // encoder: re-sign with new key
  const setSignKeyMaterial = useCallback(
    (k: KeyMaterial) => dispatch({ type: 'SET_KEY_MATERIAL', keyMaterial: k, origin: 'sign' }),
    []
  );

  return {
    token,
    header: state.header,
    payload: state.payload,
    keyMaterial: state.keyMaterial,
    parseError: state.parseError,
    verify,
    keyInputType: handler?.keyInputType ?? 'secret',
    setToken,
    clearToken,
    setHeader,
    setPayload,
    setAlg,
    setKeyMaterial,
    setSignKeyMaterial,
  };
}
