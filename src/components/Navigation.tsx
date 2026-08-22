import { BookController } from '../book/BookController';
import { BookStatus } from '../book/BookState';

export function Navigation({
  controller,
  current,
  total,
  onTick,
}: {
  controller: BookController;
  current: number;
  total: number;
  onTick: () => void;
}) {
  const open = () => {
    controller.open();
    onTick();
  };
  const previous = () => {
    controller.turn('backward');
    onTick();
  };
  const next = () => {
    controller.turn('forward');
    onTick();
  };

  return (
    <nav className="book-nav" aria-label="Book navigation">
      <button onClick={previous} disabled={controller.status !== BookStatus.OPEN} aria-label="Previous page">
        ←
      </button>
      <span aria-live="polite">{controller.status === BookStatus.CLOSED ? 'Closed' : `${Math.min(current, total)} / ${total}`}</span>
      <button onClick={controller.status === BookStatus.CLOSED ? open : next} disabled={!controller.canInteract()} aria-label={controller.status === BookStatus.CLOSED ? 'Open book' : 'Next page'}>
        {controller.status === BookStatus.CLOSED ? 'Open' : '→'}
      </button>
    </nav>
  );
}
