// Repeated sequences have identical widths, so each strip can loop without a seam.
export function mosaicRows(items, rowCount, countPerRow = 10, offset = 0) {
  const pool = items.filter(item => item.mosaic !== false);
  if (!pool.length) return [];
  return Array.from({length: rowCount}, (_, row) =>
    Array.from({length: Math.min(countPerRow, pool.length)}, (_, index) =>
      pool[(offset + row * countPerRow + index) % pool.length]));
}

export function mountMosaics(mosaics, items, makeImage, toggles = []) {
  const visible = new Map();
  const supportsObserver = 'IntersectionObserver' in window;
  let userPaused = false;
  const updateMotion = () => {
    for (const [mosaic, inView] of visible) {
      mosaic.classList.toggle('motion-paused', userPaused || document.hidden || !inView);
    }
    toggles.forEach(button => { button.textContent = userPaused ? '继续动态' : '暂停动态'; });
  };

  toggles.forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => { userPaused = !userPaused; updateMotion(); });
  });

  mosaics.forEach((mosaic, group) => {
    const isCover = mosaic.classList.contains('cover-mosaic');
    const rows = mosaicRows(items, isCover ? 3 : 1, 10, group * 7);
    for (const rowItems of rows) {
      const row = document.createElement('div');
      row.className = 'mosaic-row';
      const track = document.createElement('div');
      track.className = 'mosaic-track';
      for (let copy = 0; copy < 2; copy++) {
        const sequence = document.createElement('div');
        sequence.className = 'mosaic-sequence';
        for (const item of rowItems) {
          const tile = document.createElement('div');
          tile.className = 'mosaic-tile';
          tile.dataset.artworkId = item.id;
          tile.append(makeImage(item, true));
          sequence.append(tile);
        }
        track.append(sequence);
      }
      row.append(track);
      mosaic.append(row);
    }
    // Wait for the observer's first measurement before starting off-screen strips.
    visible.set(mosaic, !supportsObserver);
  });

  updateMotion();
  if (supportsObserver) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) visible.set(entry.target, entry.isIntersecting && entry.intersectionRatio >= 0.01);
      updateMotion();
    }, {threshold: 0.01});
    mosaics.forEach(mosaic => observer.observe(mosaic));
  }
  document.addEventListener('visibilitychange', updateMotion);
}
