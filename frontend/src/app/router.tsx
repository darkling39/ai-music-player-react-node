import { createBrowserRouter } from 'react-router-dom'
import { AttemptPage } from '@/features/attempts/pages/AttemptPage'
import { PracticePage } from '@/features/attempts/pages/PracticePage'
import { Layout } from './layout'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <PracticePage /> },
      { path: '/attempts/:id', element: <AttemptPage /> },
    ],
  },
])
