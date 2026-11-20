import { useEffect, useState } from 'react'
import { CloudSun } from 'lucide-react'

const key = 'work-manual.weather-region'
const cities = {
  daegu: ['대구광역시', 35.87, 128.60],
  seoul: ['서울특별시', 37.57, 126.98],
  busan: ['부산광역시', 35.18, 129.08],
  incheon: ['인천광역시', 37.46, 126.71],
  gwangju: ['광주광역시', 35.16, 126.85],
  daejeon: ['대전광역시', 36.35, 127.38],
  ulsan: ['울산광역시', 35.54, 129.31],
  sejong: ['세종특별자치시', 36.48, 127.29],
  jeju: ['제주시', 33.50, 126.53],
}

export function WeatherSettings() {
  const [region, setRegion] = useState(readRegion)
  const [error, setError] = useState(false)

  function change(event) {
    const value = event.target.value
    try {
      localStorage.setItem(key, value)
      setRegion(value)
      setError(false)
    } catch {
      setError(true)
    }
  }

  return (
    <section className="management-card weather-settings">
      <h2>날씨 지역</h2>
      <label className="weather-region">표시 지역
        <select value={region} onChange={change}>
          {Object.entries(cities).map(([id, [name]]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>
      {error && <p role="alert">날씨 지역을 저장할 수 없습니다.</p>}
    </section>
  )
}

function readRegion() {
  try {
    const saved = localStorage.getItem(key)
    if (Object.hasOwn(cities, saved)) return saved
  } catch {
    // Use the default when browser storage is unavailable.
  }
  return 'daegu'
}

function weatherLabel(code) {
  if (code === 0) return '맑음'
  if (code === 1 || code === 2) return '구름 조금'
  if (code === 3) return '흐림'
  if ([45, 48].includes(code)) return '안개'
  if ([51, 53, 55, 56, 57].includes(code)) return '이슬비'
  if ([61, 63, 65, 66, 67].includes(code)) return '비'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '눈'
  if ([80, 81, 82].includes(code)) return '소나기'
  if ([95, 96, 99].includes(code)) return '뇌우'
  return '상태 정보 없음'
}

export default function Weather() {
  const [[name, latitude, longitude]] = useState(() => cities[readRegion()])
  const [result, setResult] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams({
      latitude, longitude, current: 'temperature_2m,weather_code', timezone: 'Asia/Seoul',
    })

    async function refresh() {
      try {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)])
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { signal })
        if (!response.ok) throw new Error('Weather request failed')
        const { current } = await response.json()
        if (!Number.isFinite(current?.temperature_2m) || !Number.isInteger(current?.weather_code)) {
          throw new Error('Weather data missing')
        }
        if (!controller.signal.aborted) setResult(current)
      } catch {
        if (!controller.signal.aborted) setResult(false)
      }
    }

    refresh()
    const timer = window.setInterval(refresh, 900_000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [latitude, longitude])

  return (
    <section className="weather-summary" aria-label="현재 날씨">
      <span className="weather-icon"><CloudSun size={30} aria-hidden="true" /></span>
      <div className="weather-reading">
        <span className="weather-city">{name}</span>
        <div className="weather-status" role="status">
          {result ? (
            <>
              <strong>{Math.round(result.temperature_2m)}°C</strong>
              <span>{weatherLabel(result.weather_code)}</span>
            </>
          ) : result === null ? '날씨 불러오는 중' : '날씨를 불러올 수 없어요'}
        </div>
      </div>
      <div className="weather-links">
        <a href="#/settings">지역 설정</a>
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
      </div>
    </section>
  )
}
