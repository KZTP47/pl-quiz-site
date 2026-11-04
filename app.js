const topics = window.TOPICS || [];
const app = document.getElementById('app');
const storagePrefix = 'pl-quiz:flashkort:v1:';
const unsavedRatings = new Map();

const escapeText = (text) => text.replace(/[&<>]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;'
}[char]));

function ratingKey(topic, question) {
  return storagePrefix + JSON.stringify([topic.t, question[0]]);
}

function getRating(topic, question) {
  const key = ratingKey(topic, question);
  if (unsavedRatings.has(key)) return unsavedRatings.get(key);
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function saveRating(topic, question, rating) {
  const key = ratingKey(topic, question);
  try {
    localStorage.setItem(key, rating);
    unsavedRatings.delete(key);
  } catch {
    unsavedRatings.set(key, rating);
  }
}

function studyProgress(topic) {
  const progress = { known: 0, retry: 0, unseen: 0 };
  for (const question of topic.q) {
    const rating = getRating(topic, question);
    if (rating === 'known') progress.known++;
    else if (rating === 'retry') progress.retry++;
    else progress.unseen++;
  }
  return progress;
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
        <p>Välj ett ämne och testa dina kunskaper med quiz eller flashkort.</p>
      </div>
      <div class="aero-scenery" aria-hidden="true">
        <span class="bubble bubble-large"></span>
        <span class="bubble bubble-medium"></span>
        <span class="bubble bubble-small"></span>
      </div>
    </header>
    <section class="library" aria-labelledby="topics-heading">
      <h2 id="topics-heading">Ämnen</h2>
      ${storageNotice()}
      <div class="topic-list glass">
        ${topics.map((topic, index) => `
          <article class="topic">
            <span class="topic-number" aria-hidden="true">${index + 1}</span>
            <div class="topic-copy">
              <h3 id="topic-${index}">${escapeText(topic.t)}</h3>
              ${progressLabels(studyProgress(topic))}
            </div>
            <div class="topic-actions">
              <button onclick="quiz(${index})" aria-labelledby="quiz-${index} topic-${index}"><span id="quiz-${index}">Quiz</span></button>
              <button class="primary" onclick="flashcards(${index})" aria-labelledby="cards-${index} topic-${index}"><span id="cards-${index}">Flashkort</span></button>
            </div>
          </article>`).join('')}
      </div>
    </section>`, focus);
}

function screenHeader(topic, title, backAction = 'home()', backLabel = 'Alla ämnen') {
  return `<button class="back" onclick="${backAction}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>${backLabel}
  </button>
  <header class="screen-header">
    <h1 tabindex="-1">${title}</h1>
    <p>${escapeText(topic.t)}</p>
  </header>`;
}

function quiz(topicIndex, position = 0, score = 0) {
  const topic = topics[topicIndex];
  const question = topic.q[position];

  if (!question) {
    show(`${screenHeader(topic, 'Quizresultat')}
      <section class="panel glass">
        <h2>${score} av ${topic.q.length} rätt</h2>
        <button class="primary" onclick="quiz(${topicIndex})">Försök igen</button>
      </section>`);
    return;
  }

  show(`${screenHeader(topic, 'Quiz')}
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
      feedback.querySelector('button').onclick = () => quiz(topicIndex, position + 1, score + Number(correct));
    };
  });
}

function practiceButtons(topicIndex, progress) {
  const total = topics[topicIndex].q.length;
  return `<div class="action-row">
    <button class="primary" onclick="startPractice(${topicIndex}, false)" ${total ? '' : 'disabled'}>Öva på alla kort (${total})</button>
    <button onclick="startPractice(${topicIndex}, true)" ${progress.retry ? '' : 'disabled'}>Öva på missade kort (${progress.retry})</button>
  </div>
  ${progress.retry ? '' : '<p class="hint">Kort som du markerar med ”Behöver öva” hamnar här.</p>'}`;
}

function flashcards(topicIndex) {
  const topic = topics[topicIndex];
  const progress = studyProgress(topic);
  show(`${screenHeader(topic, 'Flashkort')}
    <section class="panel glass">
      <h2>Välj vilka kort du vill öva på</h2>
      <p>Försök svara innan du vänder kortet. Bedöm sedan hur det gick. Din senaste bedömning per kort sparas i den här webbläsaren.</p>
      ${progressLabels(progress)}
      ${practiceButtons(topicIndex, progress)}
      ${storageNotice()}
    </section>`);
}

function startPractice(topicIndex, missedOnly) {
  const topic = topics[topicIndex];
  const deck = missedOnly ? topic.q.filter((question) => getRating(topic, question) === 'retry') : topic.q;
  if (!deck.length) {
    flashcards(topicIndex);
    return;
  }

  const title = missedOnly ? 'Missade kort' : 'Alla kort';
  const back = `flashcards(${topicIndex})`;
  const round = { known: 0, retry: 0, skipped: 0 };

  function render(position) {
    if (position === deck.length) {
      const progress = studyProgress(topic);
      show(`${screenHeader(topic, 'Omgången är klar', back, 'Övningslägen')}
        <section class="panel glass">
          <h2>Så gick det den här omgången</h2>
          <ul class="progress-labels">
            <li class="known">${round.known} klarade</li>
            <li class="retry">${round.retry} att repetera</li>
            ${round.skipped ? `<li>${round.skipped} överhoppade</li>` : ''}
          </ul>
          ${practiceButtons(topicIndex, progress)}
          ${storageNotice()}
        </section>`);
      return;
    }

    const question = deck[position];
    show(`${screenHeader(topic, title, back, 'Övningslägen')}
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
        saveRating(topic, question, result);
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
