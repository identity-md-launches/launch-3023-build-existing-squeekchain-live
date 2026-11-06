export function Wheel({
  spinning,
  paused,
}: {
  spinning: boolean;
  paused: boolean;
}) {
  return (
    <svg
      className={`wheel-art ${spinning && !paused ? 'is-spinning' : ''}`}
      viewBox="0 0 440 300"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="218" cy="277" rx="117" ry="9" fill="#dce9d1" />
      <path
        d="m198 204-37 69m73-69 38 69"
        stroke="#53654d"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M145 274h142"
        stroke="#53654d"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle
        cx="218"
        cy="139"
        r="119"
        fill="#f4faed"
        stroke="#a5ba95"
        strokeWidth="3"
      />
      <circle cx="218" cy="139" r="106" stroke="#d4e4c8" strokeWidth="16" />
      <g className="wheel-spokes">
        {Array.from({ length: 16 }, (_, i) => (
          <path
            key={i}
            d="M218 37v19"
            transform={`rotate(${i * 22.5} 218 139)`}
            stroke="#91a782"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
        {[0, 60, 120].map((a) => (
          <path
            key={a}
            d="M218 37v204"
            transform={`rotate(${a} 218 139)`}
            stroke="#c7d9b9"
            strokeWidth="2"
          />
        ))}
      </g>
      <circle
        cx="218"
        cy="139"
        r="9"
        fill="#a5ba95"
        stroke="#f4faed"
        strokeWidth="4"
      />
      <g className="hamster-body">
        <path
          d="M150 210c-16-2-20-13-14-20"
          stroke="#b77945"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M163 222c-8 5-10 11-3 12l27-3m45-15 8 14 20 1"
          stroke="#b77945"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M146 198c0-32 24-55 52-52 15 1 25 9 32 18 21-6 42 2 46 21 2 7 12 10 9 18-3 10-22 20-44 21-26 13-67 9-87-7-6-5-8-11-8-19Z"
          fill="#d6a171"
        />
        <path
          d="M192 213c6-25 25-42 42-47 18-5 38 3 42 19 2 7 12 10 9 18-3 10-22 20-44 21-15 7-30 7-40 4-9-3-12-7-9-15Z"
          fill="#fbebd6"
        />
        <path d="M232 169c-4-12 1-26 11-26 11 0 16 15 10 27" fill="#d6a171" />
        <path d="M238 166c-2-7 0-14 5-14s8 9 5 15" fill="#c8816a" />
        <circle cx="264" cy="186" r="4" fill="#263629" />
        <circle cx="265" cy="185" r="1.2" fill="white" />
        <ellipse cx="282" cy="198" rx="5" ry="3" fill="#b97865" />
        <path
          d="m275 205-10 4m10-8-12-1"
          stroke="#ab8363"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="m213 224 15 7 17-2"
          stroke="#b77945"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <path d="M103 139a115 115 0 0 0 230 0" stroke="#8fa57f" strokeWidth="3" />
      <path
        d="M98 139v-17m240 17v-17"
        stroke="#8fa57f"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M356 78h13m-6-6v12M84 202h10m-5-5v10"
        stroke="#a5ba95"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
