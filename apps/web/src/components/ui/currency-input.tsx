import { useEffect, useState, type InputHTMLAttributes, type ReactElement } from 'react';

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

type CurrencyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: number | string | null | undefined;
  onValueChange: (value: number | null) => void;
  allowEmpty?: boolean;
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const normalized = value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value: number | string | null | undefined, allowEmpty: boolean): string {
  const numericValue = toNumber(value);
  if (numericValue === null) return allowEmpty ? '' : numberFormatter.format(0);
  return numberFormatter.format(numericValue);
}

function parseMaskedValue(value: string, allowEmpty: boolean): number | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) return allowEmpty ? null : 0;
  return Number(digits) / 100;
}

export function CurrencyInput({ value, onValueChange, allowEmpty = false, onBlur, className = '', ...props }: CurrencyInputProps): ReactElement {
  const [displayValue, setDisplayValue] = useState(() => formatCurrency(value, allowEmpty));

  useEffect(() => {
    setDisplayValue(formatCurrency(value, allowEmpty));
  }, [allowEmpty, value]);

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={displayValue}
      className={className}
      onChange={event => {
        const nextValue = parseMaskedValue(event.target.value, allowEmpty);
        onValueChange(nextValue);
        setDisplayValue(formatCurrency(nextValue, allowEmpty));
      }}
      onBlur={event => {
        setDisplayValue(formatCurrency(value, allowEmpty));
        onBlur?.(event);
      }}
    />
  );
}
