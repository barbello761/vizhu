import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useGoBack } from '../use-go-back';

const Details = () => {
  const goBack = useGoBack('/fallback');
  return (
    <button type="button" onClick={goBack}>
      Назад
    </button>
  );
};

const Here = () => <p>{useLocation().pathname}</p>;

const renderAt = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/start"
          element={
            <>
              <Here />
              <Link to="/details">Дальше</Link>
            </>
          }
        />
        <Route path="/details" element={<Details />} />
        <Route path="/fallback" element={<Here />} />
      </Routes>
    </MemoryRouter>,
  );

describe('useGoBack', () => {
  it('идёт на запасной маршрут, когда истории нет (прямая ссылка, редирект, холодный старт)', async () => {
    const user = userEvent.setup();
    renderAt('/details');

    await user.click(screen.getByRole('button', { name: 'Назад' }));

    expect(screen.getByText('/fallback')).toBeInTheDocument();
  });

  it('возвращается на предыдущий экран, когда история есть', async () => {
    const user = userEvent.setup();
    renderAt('/start');

    await user.click(screen.getByRole('link', { name: 'Дальше' }));
    await user.click(screen.getByRole('button', { name: 'Назад' }));

    expect(screen.getByText('/start')).toBeInTheDocument();
  });
});
