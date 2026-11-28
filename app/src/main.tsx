import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StudyShell } from './study-light/ui/Shell';
import { units } from './study-light/examples/catalog';
import './study-light/study.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudyShell
      units={units}
      defaultUnitId="w02-p0"
      weekTitles={{
        0: 'Google Cloud 全体地図と 24 週計画',
        1: 'IAM と Cloud Run の基礎',
        2: 'Cloud Run の運用とリリース',
      }}
    />
  </StrictMode>,
);
