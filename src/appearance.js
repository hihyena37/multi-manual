export const appearanceKey = 'work-manual.appearance.v1'
export const defaultAppearance = { color: '#f5f7fa', image: '' }
export const imageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
export const maxImageBytes = 1_500_000

export function validAppearance(value) {
  return Boolean(value && typeof value.color === 'string' && /^#[\da-f]{6}$/i.test(value.color)
    && typeof value.image === 'string' && value.image.length <= 2_000_050
    && (value.image === '' || /^data:image\/(png|jpeg|webp|gif);base64,[a-z\d+/]+=*$/i.test(value.image)))
}

export function loadAppearance() {
  try {
    const saved = JSON.parse(localStorage.getItem(appearanceKey))
    if (validAppearance(saved)) return saved
  } catch {
    // Use the default appearance when storage is unavailable.
  }
  return defaultAppearance
}

export function backgroundTextColor(color) {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const value = parseInt(color.slice(index, index + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#000' : '#fff'
}
