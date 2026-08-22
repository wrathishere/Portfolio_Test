import gsap from 'gsap';
import { BookStatus, type TurnDirection } from './BookState';

export class BookController {
  status = BookStatus.CLOSED;
  spread = 0;
  coverOpen = 0;
  turnProgress = 0;
  direction: TurnDirection = 'forward';
  notify = () => {};

  constructor(
    private maxSpread: number,
    notify: () => void,
    private reducedMotion = false,
  ) {
    this.notify = notify;
  }

  canInteract() {
    return this.status === BookStatus.CLOSED || this.status === BookStatus.OPEN;
  }

  open() {
    if (this.status !== BookStatus.CLOSED) return;
    this.status = BookStatus.OPENING;
    this.notify();
    gsap.to(this, {
      coverOpen: 1,
      duration: this.reducedMotion ? 0 : 0.95,
      ease: 'power2.inOut',
      onUpdate: this.notify,
      onComplete: () => {
        this.status = BookStatus.OPEN;
        this.notify();
      },
    });
  }

  close() {
    if (this.status !== BookStatus.OPEN || this.spread !== 0) return;
    this.status = BookStatus.CLOSING;
    this.notify();
    gsap.to(this, {
      coverOpen: 0,
      duration: this.reducedMotion ? 0 : 0.8,
      ease: 'power2.inOut',
      onUpdate: this.notify,
      onComplete: () => {
        this.status = BookStatus.CLOSED;
        this.notify();
      },
    });
  }

  turn(direction: TurnDirection) {
    if (this.status !== BookStatus.OPEN) return;
    if (direction === 'backward' && this.spread === 0) {
      this.close();
      return;
    }
    if (direction === 'forward' && this.spread >= this.maxSpread - 1) return;

    this.direction = direction;
    this.status = direction === 'forward' ? BookStatus.TURNING_FORWARD : BookStatus.TURNING_BACKWARD;
    this.turnProgress = 0;
    this.notify();

    gsap.to(this, {
      turnProgress: 1,
      duration: this.reducedMotion ? 0 : 0.82,
      ease: 'power2.inOut',
      onUpdate: this.notify,
      onComplete: () => this.finishTurn(true),
    });
  }

  setDrag(direction: TurnDirection, progress: number) {
    if (this.status === BookStatus.OPEN) {
      this.direction = direction;
      this.status = direction === 'forward' ? BookStatus.TURNING_FORWARD : BookStatus.TURNING_BACKWARD;
    }
    this.turnProgress = Math.max(0, Math.min(1, progress));
    this.notify();
  }

  releaseDrag() {
    const shouldComplete = this.turnProgress > 0.45;
    gsap.to(this, {
      turnProgress: shouldComplete ? 1 : 0,
      duration: this.reducedMotion ? 0 : 0.35,
      ease: 'power2.out',
      onUpdate: this.notify,
      onComplete: () => this.finishTurn(shouldComplete),
    });
  }

  private finishTurn(completed: boolean) {
    if (completed) this.spread += this.direction === 'forward' ? 1 : -1;
    this.turnProgress = 0;
    this.status = BookStatus.OPEN;
    this.notify();
  }
}
