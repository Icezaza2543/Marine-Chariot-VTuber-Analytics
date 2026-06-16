import 'hammerjs'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import zoomPlugin from 'chartjs-plugin-zoom'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin,
  zoomPlugin,
  ChartDataLabels,
)

ChartJS.defaults.font.family =
  '"IBM Plex Sans Thai", "Noto Sans Thai", "Leelawadee UI", "Segoe UI", sans-serif'
ChartJS.defaults.font.size = 13
ChartJS.defaults.color = '#94a3b8'
