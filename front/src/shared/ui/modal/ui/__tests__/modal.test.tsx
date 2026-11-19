import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { platform } from '@/shared/platform';

import { Modal } from '..';

/** Экран с кнопкой-открывашкой и окном, которое закрывается через onClose. */
const Harness = ({ dismissable = true }: { dismissable?: boolean }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Открыть
      </button>
      <p>Контент страницы</p>
      {open && (
        <Modal
          aria-labelledby="modal-title"
          onClose={dismissable ? () => setOpen(false) : undefined}
        >
          <h2 id="modal-title">Окно</h2>
          <button type="button" onClick={() => setOpen(false)}>
            Закрыть
          </button>
        </Modal>
      )}
    </>
  );
};

describe('Modal — фолбэк без showModal (jsdom, iOS 15.0–15.3)', () => {
  it('объявляется модальным диалогом с именем', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Открыть' }));

    const dialog = screen.getByRole('dialog', { name: 'Окно' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('open');
  });

  it('гасит фон, ставит фокус внутрь и возвращает его после закрытия', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Открыть' });
    await userEvent.click(opener);

    const page = screen.getByText('Контент страницы');
    expect(page).toHaveAttribute('inert');
    expect(page).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Закрыть' })).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }));

    expect(page).not.toHaveAttribute('inert');
    expect(page).not.toHaveAttribute('aria-hidden');
    expect(opener).toHaveFocus();
  });

  it('Escape закрывает окно с onClose', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Открыть' }));

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('окно без onClose Escape не закрывает', async () => {
    render(<Harness dismissable={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Открыть' }));

    await userEvent.keyboard('{Escape}');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('ставит фокус на initialFocusRef', () => {
    const WithInitialFocus = () => {
      const ref = useRef<HTMLButtonElement>(null);
      return (
        <Modal aria-label="Окно" initialFocusRef={ref}>
          <button type="button">Первая</button>
          <button type="button" ref={ref}>
            Нужная
          </button>
        </Modal>
      );
    };
    render(<WithInitialFocus />);

    expect(screen.getByRole('button', { name: 'Нужная' })).toHaveFocus();
  });

  it('объявления скринридеру уходят в live-регион окна, а не на inert-фон', () => {
    vi.useFakeTimers();
    try {
      render(
        <>
          <div id="sr-announcer" />
          <Modal aria-label="Окно">
            <button type="button">Ок</button>
          </Modal>
        </>,
      );

      act(() => {
        announceRouteChange('Говорите');
        vi.advanceTimersByTime(50);
      });

      const dialog = screen.getByRole('dialog');
      expect(dialog.querySelector('[data-sr-announcer]')).toHaveTextContent('Говорите');
      expect(document.getElementById('sr-announcer')).toBeEmptyDOMElement();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Modal — нативный showModal', () => {
  afterEach(() => {
    // Сначала размонтировать окна: их cleanup зовёт подменённый close.
    cleanup();
    vi.restoreAllMocks();
    // jsdom не реализует эти методы — убираем подменённые, чтобы не влиять на фолбэк-тесты.
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
  });

  const stubShowModal = () => {
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    const close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
    Object.assign(HTMLDialogElement.prototype, { showModal, close });
    return { showModal, close };
  };

  it('открывает через showModal и закрывает через close, фон вручную не трогает', async () => {
    const { showModal, close } = stubShowModal();
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Открыть' }));

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Контент страницы')).not.toHaveAttribute('inert');

    await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(close).toHaveBeenCalled();
  });

  it('cancel (Escape, «назад» браузера) отменяется и закрывает через onClose', async () => {
    stubShowModal();
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Открыть' }));

    const cancel = new Event('cancel', { cancelable: true });
    act(() => {
      screen.getByRole('dialog').dispatchEvent(cancel);
    });

    expect(cancel.defaultPrevented).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('окно без onClose, закрытое браузером вопреки отмене, открывается снова', async () => {
    const { showModal } = stubShowModal();
    render(<Harness dismissable={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Открыть' }));

    fireEvent(screen.getByRole('dialog'), new Event('close'));

    expect(showModal).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('Modal — системная «назад» Android', () => {
  afterEach(() => vi.restoreAllMocks());

  /** Подменяет порт: сохраняет подписчиков, чтобы «нажать» кнопку из теста. */
  const stubBackButton = () => {
    const handlers = new Set<() => void>();
    const unsubscribe = vi.fn();
    vi.spyOn(platform.backButton, 'subscribe').mockImplementation((handler) => {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
        unsubscribe();
      };
    });
    return { press: () => act(() => handlers.forEach((h) => h())), unsubscribe };
  };

  it('закрывает окно и отписывается после закрытия', async () => {
    const back = stubBackButton();
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Открыть' }));

    back.press();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(back.unsubscribe).toHaveBeenCalled();
  });

  it('у окна без onClose перехватывается, но ничего не закрывает', async () => {
    const back = stubBackButton();
    render(<Harness dismissable={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Открыть' }));

    back.press();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('при двух окнах закрывает только верхнее', () => {
    const back = stubBackButton();
    const onCloseBottom = vi.fn();
    const onCloseTop = vi.fn();
    render(
      <>
        <Modal aria-label="Нижнее" onClose={onCloseBottom}>
          <button type="button">Нижняя</button>
        </Modal>
        <Modal aria-label="Верхнее" onClose={onCloseTop}>
          <button type="button">Верхняя</button>
        </Modal>
      </>,
    );

    back.press();

    expect(onCloseTop).toHaveBeenCalledTimes(1);
    expect(onCloseBottom).not.toHaveBeenCalled();
  });
});
