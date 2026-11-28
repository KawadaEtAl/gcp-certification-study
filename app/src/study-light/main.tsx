import { createRoot } from 'react-dom/client';
import { StudyShell } from './ui/Shell';
import { units } from './examples/catalog';
import './study.css';
createRoot(document.getElementById('root')!).render(
  <StudyShell units={units} weekTitles={{ 1: 'IAM と Cloud Run の基礎', 2: 'Cloud Run の運用とリリース' }} />,
);
