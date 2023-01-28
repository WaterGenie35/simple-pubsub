export class LinkedList<T> {
  public value: T;
  public next: LinkedList<T> | undefined;

  constructor(value: T, next?: LinkedList<T> | undefined) {
    this.value = value;
    this.next = next;
  }
}

export class Queue<T> {
  private head: LinkedList<T> | undefined;
  private tail: LinkedList<T> | undefined;

  constructor() {
    this.head = undefined;
    this.tail = undefined;
  }

  public enqueue(item: T): void {
    const newNode = new LinkedList<T>(item);
    if (this.tail === undefined) {
      this.head = newNode;
      this.tail = this.head;
    } else {
      this.tail.next = newNode;
      this.tail = newNode;
    }
  }

  public dequeue(): T | undefined {
    if (this.head === undefined) {
      return undefined;
    }
    const item = this.head.value;
    if (this.head.next === undefined) {
      this.head = undefined;
      this.tail = undefined;
    } else {
      this.head = this.head.next;
    }
    return item;
  }
}
