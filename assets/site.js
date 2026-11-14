'use strict';
// Keep anchored headings visible below the responsive, sticky navigation.
const header = document.querySelector('.site-header');
const measureHeader = () => document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
measureHeader();
if ('ResizeObserver' in window) new ResizeObserver(measureHeader).observe(header);
// Avoid many concurrent video decoders or overlapping playback.
const videos = [...document.querySelectorAll('video')];
videos.forEach(video => video.addEventListener('play', () => {
  const pair = video.closest('.video-pair');
  videos.forEach(other => {
    if (other !== video && (!pair || other.closest('.video-pair') !== pair)) other.pause();
  });
}));
// Update the active section without rewriting shared fragment URLs.
const sections = [...document.querySelectorAll('.demo-section')];
const links = [...document.querySelectorAll('.section-nav a')];
let scheduled = false;
function updateSection() {
  scheduled = false;
  const edge = header.getBoundingClientRect().height + 80;
  const current = sections.filter(section => section.getBoundingClientRect().top <= edge).at(-1);
  links.forEach(link => {
    const active = Boolean(current && link.hash === `#${current.id}`);
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
  });
}
window.addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateSection); } }, {passive:true});
window.addEventListener('resize', updateSection);
window.addEventListener('load', () => {
  measureHeader();
  // Browser fragment scrolling can precede final header layout.
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({behavior:'instant'});
  updateSection();
});
updateSection();

// HTTP reads the latest paired TXT; direct-file browsing uses the generated snapshot.
async function loadAnnotation(element) {
  if (location.protocol === 'file:') return;
  element.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch(element.dataset.annotationSrc, {cache: 'no-store'});
    if (!response.ok) throw new Error('Annotation unavailable');
    const text = await response.text();
    if (element.dataset.annotationMode === 'motion') {
      const fragment = document.createDocumentFragment();
      for (const line of text.match(/[^\n]*\n|[^\n]+$/g) || []) {
        const match = line.match(/^(\s*)(translation|reorientation|manipulation)(\s*:)/i);
        if (match) {
          const span = document.createElement('span');
          span.className = 'motion-amplitude';
          const label = match[2].toLowerCase();
          span.textContent = match[1] + label[0].toUpperCase() + label.slice(1)
            + line.slice(match[1].length + match[2].length);
          fragment.append(span);
        } else fragment.append(document.createTextNode(line));
      }
      element.replaceChildren(fragment);
    } else {
      element.textContent = element.dataset.annotationMode === 'prompt'
        ? text.split(/\r?\n/).filter(line => /^\s*prompt\s*:/i.test(line))
          .map(line => line.replace(/^(\s*)prompt(\s*:)/i, '$1Prompt$2')).join('\n')
        : text;
    }
  } catch {
    // Keep the original TXT snapshot readable if hosting cannot serve annotations.
    element.title = 'Showing the saved description; the latest TXT could not be loaded.';
  } finally {
    element.setAttribute('aria-busy', 'false');
  }
}
document.querySelectorAll('[data-annotation-src]').forEach(loadAnnotation);
