export function compactNumber(value: number) {
  return new Intl.NumberFormat('en', {
    notation: value >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 10_000 ? 1 : 0,
  }).format(value)
}

export function percent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`
}

export function signedPercent(value: number, digits = 1) {
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(digits)}%`
}

export function decimal(value: number, digits = 1) {
  return value.toFixed(digits)
}

export function minutesLabel(value: number) {
  if (value >= 60) {
    return `${decimal(value / 60, 1)}h`
  }

  return `${decimal(value, 0)}m`
}

export function thaiMonthLabel(month: number) {
  return [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ][month - 1]
}
