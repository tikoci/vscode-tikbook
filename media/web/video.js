/* eslint-env browser */
/* global document, setTimeout */

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const videoEl = document.getElementById('video')
  const activeChapterEl = document.getElementById('activeChapter')
  const chaptersListEl = document.getElementById('chaptersList')
  const currentTimeEl = document.getElementById('currentTime')
  const nextChapterTimeDiffEl = document.getElementById('nextChapterTimeDiff')
  const titleEl = document.querySelector('.title')

  // const nextChapterTimeEl = document.getElementById('nextChapterTime')

  // WebVTT track
  const chapterTrack = videoEl.textTracks[1]

  // Handle chapter changes
  chapterTrack.oncuechange = () => {
    const activeCue = chapterTrack.activeCues[0]
    if (!activeCue) return

    activeChapterEl.textContent = activeCue.text

    // Update active chapter in list
    chaptersListEl.querySelectorAll('li').forEach((li) => {
      li.classList.remove('activeChapter')
      if (li.querySelector('a').textContent === activeCue.text) {
        li.classList.add('activeChapter')
      }
    })
  }
  function hideWhenPlaying(hide = true) {
    if (hide) {
      titleEl.style.visibility = 'hidden' // .setAttribute('hidden', '')
    }
    else {
      titleEl.style.visibility = 'visible' // .removeAttribute('hidden', '')
    }
  }
  videoEl.addEventListener('playing', () => {
    hideWhenPlaying()
  })
  videoEl.addEventListener('stop', () => {
    hideWhenPlaying(false)
  })
  videoEl.addEventListener('play', () => {
    hideWhenPlaying()
  })
  videoEl.addEventListener('pause', () => {
    hideWhenPlaying(false)
  })
  videoEl.addEventListener('waiting', () => {
    hideWhenPlaying(false)
  })
  videoEl.addEventListener('ended', () => {
    hideWhenPlaying(false)
  })

  // Update time display
  videoEl.addEventListener('timeupdate', () => {
    // title
    hideWhenPlaying()

    // chapter times
    currentTimeEl.textContent = `${videoEl.currentTime.toFixed(1)}s`
    const activeCue = chapterTrack.activeCues[0]
    if (activeCue) {
      const remaining = activeCue.endTime - videoEl.currentTime
      nextChapterTimeDiffEl.textContent = `${remaining.toFixed(1)}s`
    }
  })

  // Initialize chapter navigation
  chapterTrack.mode = 'hidden'

  // Wait for track to load
  const initChapters = () => {
    if (chapterTrack.cues && chapterTrack.cues.length > 0) {
      buildChapterList()
      chaptersListEl.style.visibility = 'visible'
    }
    else {
      chapterTrack.mode = 'hidden' // force load?
      chaptersListEl.style.visibility = 'hidden'
      setTimeout(initChapters, 1000)
    }
  }

  const buildChapterList = () => {
    chaptersListEl.innerHTML = ''
    Array.from(chapterTrack.cues).forEach((cue, _idx) => {
      const li = document.createElement('li')
      const link = document.createElement('a')

      link.href = '#'
      link.textContent = cue.text
      link.addEventListener('click', (e) => {
        e.preventDefault()
        videoEl.currentTime = cue.startTime
      })

      li.appendChild(link)
      chaptersListEl.appendChild(li)
    })
  }

  initChapters()
})
