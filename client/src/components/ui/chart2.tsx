import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import React from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export const ChartBar = ({ data, options }: any) => <Bar data={data} options={options} />;
export const ChartPie = ({ data, options }: any) => <Pie data={data} options={options} />;
export const ChartLine = ({ data, options }: any) => <Line data={data} options={options} />;
