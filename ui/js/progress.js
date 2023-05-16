class Progress {
  constructor() {
    this.modalElement = $('[data-e="progress-modal"]');
    if (!this.modalElement) {
      this.initialized = false;
      return;
    }
    this.initialized = true;
    this.currentElement = this.modalElement.find('[data-e="progress-current"]');
    this.barElement = this.modalElement.find('[data-e="progress-bar"]');
    this.timeElement = this.modalElement.find('[data-e="progress-time"]');
    this.totalElement = this.modalElement.find('[data-e="progress-total"]');
    this.typeElement = this.modalElement.find('[data-e="progress-type"]')
    this.modal = new bootstrap.Modal(this.modalElement[0], {
      backdrop: 'static',
      keyboard: false
    });
    this.status = 0;
    this.start = Date.now();
    this.startIndex = 0;
    $('[data-a="stop"]').on('click', this.end.bind(this));
  }

  init(title, total, onStop) {
    this.status = 1;
    this.modal.show();
    this.start = Date.now();
    this.startIndex = 0;
    this.typeElement.text(title);
    this.totalElement.text(`${total}`);
    this.onStop = onStop ? onStop : null;
    this.setProgress(0, total);
  }

  setStartIndex(index) {
    this.startIndex = index;
  }

  setProgress(current, total) {
    this.currentElement.text(current);
    this.totalElement.text(total);
    this.barElement.width(`${current / total * 100}%`);
    if (current - this.startIndex === 0) {
      this.timeElement.text('?:??');
    }
    else {
      const now = Date.now(),
            currentTime = now - this.start,
            remainingTime = current < total ? currentTime / (current - this.startIndex) * (total - current) / 1000 : 0,
            remainingMins = Math.floor(remainingTime / 60),
            remainingSecs = Math.round(remainingTime % 60);
      this.timeElement.text(`${remainingMins}:${remainingSecs >= 10 ? remainingSecs : `0${remainingSecs}`}`);
    }
  }

  end() {
    this.status = 0;
    if (Date.now() - this.start < 1000) {
      setTimeout(() => {
        this.modal.hide();
        if (this.onStop) this.onStop();
      }, 1000 - (Date.now() - this.start));
    }
    else {
      this.modal.hide();
      if (this.onStop) this.onStop();
    }
  }
}
window.progress = new Progress();