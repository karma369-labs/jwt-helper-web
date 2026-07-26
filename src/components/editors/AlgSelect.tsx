import { memo } from 'react';
import { algorithmNames } from '../../core/jwt/algorithms';

interface Props {
  alg: string;
  onChange: (alg: string) => void;
}

function AlgSelectImpl({ alg, onChange }: Props) {
  return (
    <select className="alg-select" aria-label="Algorithm" value={alg} onChange={(e) => onChange(e.target.value)}>
      {algorithmNames.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}

export const AlgSelect = memo(AlgSelectImpl);
