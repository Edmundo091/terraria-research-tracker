import { useState } from 'react';

export default function CustomSelect({ value, onChange, options }: { value: number; onChange: (v: number) => void; options: number[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="custom-select">
      <button className="custom-select-btn" onClick={() => setOpen(!open)}>
        {value}<span className="custom-select-arrow">▼</span>
      </button>
      {open && (
        <div className="custom-select-menu">
          {options.map(o => (
            <button key={o} className="custom-select-option" onClick={() => { onChange(o); setOpen(false); }}>{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}
