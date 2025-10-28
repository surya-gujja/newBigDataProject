export default class Timer {
  constructor(label) {
    this.label = label;
    this.startedAt = null;
    this.stoppedAt = null;
  }

  start() {
    this.startedAt = process.hrtime.bigint();
  }

  stop() {
    this.stoppedAt = process.hrtime.bigint();
    return this.durationInMs();
  }

  durationInMs() {
    if (!this.startedAt) {
      return 0;
    }
    const end = this.stoppedAt ?? process.hrtime.bigint();
    return Number(end - this.startedAt) / 1_000_000;
  }
}
