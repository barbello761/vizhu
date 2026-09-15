import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DemoNotice } from '../DemoNotice';

const config = vi.hoisted(() => ({ env: { isDemo: false } }));
vi.mock('@/shared/config', () => config);

describe('DemoNotice', () => {
  it('на проде ничего не рендерит', () => {
    config.env.isDemo = false;
    const { container } = render(<DemoNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it('на демо-стенде предупреждает об удалении данных', () => {
    config.env.isDemo = true;
    render(<DemoNotice />);
    expect(
      screen.getByText(/данные будут удалены после окончания демонстрации/),
    ).toBeInTheDocument();
  });
});
