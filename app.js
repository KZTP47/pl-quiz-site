const courses = window.COURSES;
const legacyCourse = courses.find((course) => course.id === 'pl55');
legacyCourse.topics.push(...(window.TOPICS || []));
const app = document.getElementById('app');
const storagePrefix = 'pl-quiz:flashkort:v1:';
const unsavedRatings = new Map();
const reviewIntervals = [2, 4, 7, 14, 30];

const escapeText = (text) => text.replace(/[&<>]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;'
}[char]));

function ratingKey(course, topic, question) {
  // Keep the original keys for Projektledning so earlier ratings still apply.
  const parts = course === legacyCourse ? [topic.t, question[0]] : [course.id, topic.t, question[0]];
  return storagePrefix + JSON.stringify(parts);
}

function getReview(course, topic, question) {
  const key = ratingKey(course, topic, question);
  if (unsavedRatings.has(key)) return unsavedRatings.get(key);
  try {
    const value = localStorage.getItem(key);
    // Earlier versions saved a rating without a date. Include those cards now.
    if (value === 'known' || value === 'retry') return { rating: value, level: 0, dueAt: 0 };
    const review = JSON.parse(value);
    if (review?.rating === 'known' || review?.rating === 'retry') {
      return {
        rating: review.rating,
        level: Number.isInteger(review.level) && review.level >= 0 && review.level <= reviewIntervals.length ? review.level : 0,
        dueAt: Number.isFinite(review.dueAt) && review.dueAt > 0 && review.dueAt <= 8.64e15 ? review.dueAt : 0
      };
    }
  } catch {
    // Storage can be blocked or contain an invalid entry.
  }
  return null;
}

function saveRating(course, topic, question, rating) {
  const previous = getReview(course, topic, question);
  const now = new Date();
  // A successful practice before the due date doesn't advance the interval.
  if (rating === 'known' && previous?.rating === 'known' && previous.dueAt > now.getTime()) return;
  const level = rating === 'known' ? Math.min((previous?.level ?? 0) + 1, reviewIntervals.length) : 0;
  const days = level ? reviewIntervals[level - 1] : 1;
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() + days);
  const review = { rating, level, dueAt: now.getTime() };
  const key = ratingKey(course, topic, question);
  try {
    localStorage.setItem(key, JSON.stringify(review));
    unsavedRatings.delete(key);
  } catch {
    unsavedRatings.set(key, review);
  }
}

function studyProgress(course, topic) {
  const progress = { known: 0, retry: 0, unseen: 0 };
  for (const question of topic.q) {
    const rating = getReview(course, topic, question)?.rating;
    if (rating === 'known') progress.known++;
    else if (rating === 'retry') progress.retry++;
    else progress.unseen++;
  }
  return progress;
}

function courseReviews(course) {
  return course.topics.flatMap((topic) => topic.q.flatMap((question) => {
    const review = getReview(course, topic, question);
    return review ? [{ topic, question, ...review }] : [];
  }));
}

function dailyReviewPanel(courseIndex, reviews) {
  const now = Date.now();
  const dueCount = reviews.filter((card) => card.dueAt <= now).length;
  const nextDate = dueCount || !reviews.length ? null : new Date(Math.min(...reviews.map((card) => card.dueAt)));
  let message = 'Bedöm ett flashkort för att börja planera dina repetitioner.';
  if (dueCount) {
    message = dueCount === 1 ? '1 kort är redo att repeteras.' : `${dueCount} kort är redo att repeteras.`;
  } else if (nextDate) {
    message = `Du är ikapp. Nästa repetition är ${nextDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
  }

  return `<section class="panel glass daily-review" aria-labelledby="daily-heading">
    <h2 id="daily-heading">Dagens repetition</h2>
    <p>${message}</p>
    ${dueCount ? `<button class="primary" onclick="startDailyReview(${courseIndex})">Starta repetition</button>` : ''}
  </section>`;
}

function progressLabels({ known, retry, unseen }) {
  return `<ul class="progress-labels" aria-label="Sparade kortbedömningar">
    <li class="known">${known} klarade</li>
    <li class="retry">${retry} att repetera</li>
    <li>${unseen} oövade</li>
  </ul>`;
}

function storageNotice() {
  return unsavedRatings.size
    ? '<p class="notice" role="status">Webbläsaren kunde inte spara alla bedömningar. De finns kvar tills du lämnar eller laddar om sidan.</p>'
    : '';
}

function show(markup, focus = true) {
  app.innerHTML = markup;
  if (focus) app.querySelector('h1').focus();
}

function home(focus = true) {
  show(`
    <header class="hero glass">
      <div class="hero-copy">
        <h1 tabindex="-1">Projektledning</h1>
        <p>Välj en kurs i utbildningen IT-projektledare och öva med quiz eller flashkort.</p>
      </div>
      <div class="aero-scenery" aria-hidden="true">
        <span class="bubble bubble-large"></span>
        <span class="bubble bubble-medium"></span>
        <span class="bubble bubble-small"></span>
      </div>
    </header>
    <section class="library" aria-labelledby="courses-heading">
      <h2 id="courses-heading">Kurser</h2>
      ${storageNotice()}
      <div class="topic-list glass">
        ${courses.map((course, index) => {
          const count = course.topics.reduce((total, topic) => total + topic.q.length, 0);
          return `<article class="topic course">
            <div class="topic-copy">
              <h3 id="course-${index}">${escapeText(course.name)}</h3>
              <p class="course-detail">${course.yhp} YHP · ${count ? `${course.topics.length} ämnen · ${count} frågor` : 'Inga quiz ännu'}</p>
            </div>
            <div class="topic-actions">
              <button class="${count ? 'primary' : ''}" onclick="openCourse(${index})" aria-labelledby="open-${index} course-${index}"><span id="open-${index}">Öppna kurs</span></button>
            </div>
          </article>`;
        }).join('')}
      </div>
    </section>`, focus);
}

function openCourse(courseIndex) {
  const course = courses[courseIndex];
  show(`${backButton('home()', 'Alla kurser')}
    <header class="screen-header">
      <h1 tabindex="-1">${escapeText(course.name)}</h1>
      <p>${course.yhp} YHP</p>
    </header>
    ${course.topics.some((topic) => topic.q.length) ? dailyReviewPanel(courseIndex, courseReviews(course)) : ''}
    <section aria-labelledby="topics-heading">
      <h2 id="topics-heading">Ämnen</h2>
      ${storageNotice()}
      ${course.topics.length ? `<div class="topic-list glass">
        ${course.topics.map((topic, index) => `
          <article class="topic">
            <span class="topic-number" aria-hidden="true">${index + 1}</span>
            <div class="topic-copy">
              <h3 id="topic-${index}">${escapeText(topic.t)}</h3>
              ${progressLabels(studyProgress(course, topic))}
            </div>
            <div class="topic-actions">
              <button onclick="quiz(${courseIndex}, ${index})" aria-labelledby="quiz-${index} topic-${index}"><span id="quiz-${index}">Quiz</span></button>
              <button class="primary" onclick="flashcards(${courseIndex}, ${index})" aria-labelledby="cards-${index} topic-${index}"><span id="cards-${index}">Flashkort</span></button>
            </div>
          </article>`).join('')}
      </div>` : '<div class="panel glass"><p>Inga quiz eller flashkort har lagts till för den här kursen ännu.</p></div>'}
    </section>`);
}

function backButton(backAction, backLabel) {
  return `<button class="back" onclick="${backAction}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>${backLabel}
  </button>`;
}

function screenHeader(courseIndex, subtitle, title, backAction = `openCourse(${courseIndex})`, backLabel = 'Alla ämnen') {
  return `${backButton(backAction, backLabel)}
  <header class="screen-header">
    <h1 tabindex="-1">${title}</h1>
    <p>${escapeText(subtitle)}</p>
  </header>`;
}

function quiz(courseIndex, topicIndex, position = 0, score = 0) {
  const topic = courses[courseIndex].topics[topicIndex];
  const question = topic.q[position];

  if (!question) {
    show(`${screenHeader(courseIndex, topic.t, 'Quizresultat')}
      <section class="panel glass">
        <h2>${score} av ${topic.q.length} rätt</h2>
        <button class="primary" onclick="quiz(${courseIndex}, ${topicIndex})">Försök igen</button>
      </section>`);
    return;
  }

  show(`${screenHeader(courseIndex, topic.t, 'Quiz')}
    <div class="meter">
      <span>Fråga ${position + 1} av ${topic.q.length}</span>
      <progress aria-label="Frågor i quizet" value="${position + 1}" max="${topic.q.length}"></progress>
    </div>
    <section class="panel glass">
      <h2>${escapeText(question[0])}</h2>
      <div class="options">
        ${question[1].map((option, index) => `<button class="option" data-index="${index}">${escapeText(option)}</button>`).join('')}
      </div>
      <div id="feedback"></div>
    </section>`);

  const options = app.querySelectorAll('.option');
  options.forEach((option) => {
    option.onclick = () => {
      const correct = Number(option.dataset.index) === question[2];
      for (const button of options) button.disabled = true;
      options[question[2]].classList.add('correct');
      if (!correct) option.classList.add('incorrect');
      const feedback = document.getElementById('feedback');
      feedback.innerHTML = `<p tabindex="-1"><strong>${correct ? 'Rätt!' : 'Inte riktigt.'}</strong> ${escapeText(question[3])}</p>
        <button class="primary">${position + 1 < topic.q.length ? 'Nästa fråga' : 'Se resultat'}</button>`;
      feedback.querySelector('p').focus();
      feedback.querySelector('button').onclick = () => quiz(courseIndex, topicIndex, position + 1, score + Number(correct));
    };
  });
}

function practiceButtons(courseIndex, topicIndex, progress) {
  const total = courses[courseIndex].topics[topicIndex].q.length;
  return `<div class="action-row">
    <button class="primary" onclick="startPractice(${courseIndex}, ${topicIndex}, false)" ${total ? '' : 'disabled'}>Öva på alla kort (${total})</button>
    <button onclick="startPractice(${courseIndex}, ${topicIndex}, true)" ${progress.retry ? '' : 'disabled'}>Öva på missade kort (${progress.retry})</button>
  </div>
  ${progress.retry ? '' : '<p class="hint">Kort som du markerar med ”Behöver öva” hamnar här.</p>'}`;
}

function flashcards(courseIndex, topicIndex) {
  const course = courses[courseIndex];
  const topic = course.topics[topicIndex];
  const progress = studyProgress(course, topic);
  show(`${screenHeader(courseIndex, topic.t, 'Flashkort')}
    <section class="panel glass">
      <h2>Välj vilka kort du vill öva på</h2>
      <p>Försök svara innan du vänder kortet. Bedöm sedan hur det gick. Din senaste bedömning per kort sparas i den här webbläsaren.</p>
      ${progressLabels(progress)}
      ${practiceButtons(courseIndex, topicIndex, progress)}
      ${storageNotice()}
    </section>`);
}

function startPractice(courseIndex, topicIndex, missedOnly) {
  const course = courses[courseIndex];
  const topic = course.topics[topicIndex];
  const questions = missedOnly ? topic.q.filter((question) => getReview(course, topic, question)?.rating === 'retry') : topic.q;
  if (!questions.length) {
    flashcards(courseIndex, topicIndex);
    return;
  }

  practiceRound(courseIndex, questions.map((question) => ({ topic, question })), {
    title: missedOnly ? 'Missade kort' : 'Alla kort',
    summarySubtitle: topic.t,
    backAction: `flashcards(${courseIndex}, ${topicIndex})`,
    backLabel: 'Övningslägen',
    finishActions: () => practiceButtons(courseIndex, topicIndex, studyProgress(course, topic))
  });
}

function startDailyReview(courseIndex) {
  const course = courses[courseIndex];
  const now = Date.now();
  const deck = courseReviews(course)
    .filter((card) => card.dueAt <= now)
    .sort((a, b) => Number(b.rating === 'retry') - Number(a.rating === 'retry') || a.dueAt - b.dueAt);
  if (!deck.length) {
    openCourse(courseIndex);
    return;
  }
  practiceRound(courseIndex, deck, {
    title: 'Dagens repetition',
    summarySubtitle: course.name,
    backAction: `openCourse(${courseIndex})`,
    backLabel: 'Till kursen'
  });
}

function practiceRound(courseIndex, deck, { title, summarySubtitle, backAction, backLabel, finishActions }) {
  const course = courses[courseIndex];
  const round = { known: 0, retry: 0, skipped: 0 };

  function render(position) {
    if (position === deck.length) {
      show(`${screenHeader(courseIndex, summarySubtitle, 'Omgången är klar', backAction, backLabel)}
        <section class="panel glass">
          <h2>Så gick det den här omgången</h2>
          <ul class="progress-labels">
            <li class="known">${round.known} klarade</li>
            <li class="retry">${round.retry} att repetera</li>
            ${round.skipped ? `<li>${round.skipped} överhoppade</li>` : ''}
          </ul>
          ${finishActions?.() ?? ''}
          ${storageNotice()}
        </section>`);
      return;
    }

    const { topic, question } = deck[position];
    show(`${screenHeader(courseIndex, topic.t, title, backAction, backLabel)}
      <div class="meter">
        <span>Kort ${position + 1} av ${deck.length}</span>
        <progress aria-label="Kort i omgången" value="${position + 1}" max="${deck.length}"></progress>
      </div>
      <div class="flash-frame glass">
        <button class="flashcard" type="button" aria-expanded="false" aria-controls="rating">
          <span class="flash-face"></span>
          <span class="flash-action"></span>
        </button>
        <div id="rating" class="action-row" hidden>
          <button class="rate-retry" data-rating="retry">Behöver öva</button>
          <button class="rate-known" data-rating="known">Klarade det</button>
        </div>
      </div>
      <button class="skip">Hoppa över kortet</button>
      ${storageNotice()}`);

    const card = app.querySelector('.flashcard');
    const rating = document.getElementById('rating');
    const face = card.querySelector('.flash-face');
    const action = card.querySelector('.flash-action');
    let revealed = false;

    function updateFace() {
      face.innerHTML = revealed
        ? `<strong>${escapeText(question[1][question[2]])}</strong><span class="explanation">${escapeText(question[3])}</span>`
        : `<strong>${escapeText(question[0])}</strong>`;
      action.textContent = revealed ? 'Visa frågan' : 'Visa svaret';
      card.setAttribute('aria-expanded', String(revealed));
      rating.hidden = !revealed;
    }

    card.onclick = () => {
      revealed = !revealed;
      updateFace();
    };

    for (const button of rating.querySelectorAll('button')) {
      button.onclick = () => {
        const result = button.dataset.rating;
        saveRating(course, topic, question, result);
        round[result]++;
        render(position + 1);
      };
    }

    app.querySelector('.skip').onclick = () => {
      round.skipped++;
      render(position + 1);
    };
    updateFace();
  }

  render(0);
}

home(false);
