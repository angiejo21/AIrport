const OPENAI = {
  API_BASE_URL: "https://api.openai.com/v1",
  API_KEY: "",
  GPT_MODEL: "gpt-3.5-turbo",
  CHAT_ENDPOINT: "/chat/completions",
  IMAGE_ENDPOINT: "/images/generations",
};

const TOMTOM_KEY = "";

const form = document.querySelector("form");
const travel = document.querySelector(".travel");
const cards = document.querySelector(".cards");
const template = document.querySelector("template");
let travelFormData;
let travelPlan;
let tomtomMap;

form.addEventListener("submit", onFormSubmit);

function onFormSubmit(event) {
  event.preventDefault();
  setTravelFormData();
  createTravel();
}

async function createTravel() {
  setAppState("loading");
  const prompt = `\
    Organizza un weekend di 3 giorni a ${travelFormData.location}. Siamo in ${travelFormData.season}. Sarò ${travelFormData.company}. 
    Per ogni tappa dammi un titolo spiritoso, una lista di luoghi da visitare con le coordinate e qualche 
    curiosità del luogo. Le tue risposte sono solo in formato JSON come questo esempio:

    ###

    {
        "stages": [{
            "title": "Titolo della tappa",
            "places": [
                {
                    "name": "Nome luogo 1",
                    "coordinates": ["lng", "lat"]             
                },
                {
                    "name": "Nome luogo 2",
                    "coordinates": ["lng", "lat"]             
                }        
            ],
            "facts": "curiosità sul luogo in breve"
        }]
    }

    ###`;

  const travelContentResponse = await makeRequest(OPENAI.CHAT_ENDPOINT, {
    model: OPENAI.GPT_MODEL,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
  });

  travelPlan = JSON.parse(travelContentResponse.choices[0].message.content);
  renderTravelContent();
  setAppState("travel");
  const travelImageResponse = await makeRequest(OPENAI.IMAGE_ENDPOINT, {
    prompt: `Un weekend a ${travelFormData.location} in ${travelFormData.season}${travelFormData.company}. `,
    n: 1,
    size: "512x512",
  });
  travelPlan.imageURL = travelImageResponse.data[0].url;
  renderTravelImage();
}

function renderTravelContent() {
  renderTravelTitle();
  renderTravelStages();
  renderTravelMap();
}

function renderTravelMap() {
  tomtomMap = tt.map({
    key: TOMTOM_KEY,
    container: "map",
  });
  const bounds = new tt.LngLatBounds();
  travelPlan.stages.forEach(function (stage, index) {
    stage.places.forEach(function (place) {
      renderPlaceMarker(place, index);
      bounds.extend(place.coordinates);
    });
  });

  tomtomMap.once("idle", function () {
    tomtomMap.fitBounds(bounds, {
      padding: { top: 10, bottom: 10, left: 5, right: 5 },
    });
  });
}
function renderPlaceMarker(place, index) {
  const marker = document.createElement("div");
  marker.innerHTML = '<img src="assets/img/marker.svg" alt="icona marker">';
  marker.dataset.cardId = index;
  marker.addEventListener("mouseenter", onCardMouseEnter);
  marker.addEventListener("mouseleave", onCardMouseLeave);
  const popup = new tt.Popup({ offset: 30 }).setText(place.name);

  new tt.Marker(marker)
    .setLngLat(place.coordinates)
    .setPopup(popup)
    .addTo(tomtomMap);
}

function onCardMouseEnter(event) {
  const cardID = event.currentTarget.dataset.cardId;
  cards.querySelector(`.card[data-card-id="${cardID}"]`).classList.add("hover");
}
function onCardMouseLeave(event) {
  const cardID = event.currentTarget.dataset.cardId;
  cards
    .querySelector(`.card[data-card-id="${cardID}"]`)
    .classList.remove("hover");
}

function renderTravelImage() {
  travel.querySelector(
    ".travel-image"
  ).innerHTML = `<img src='${travelPlan.imageURL}' alt='foto viaggio'>`;
}

function stageComponent(stage, index) {
  const card = template.content.cloneNode(true).querySelector(".card");

  card.dataset.cardId = index;
  card.querySelector(".card-day").innerText = `Giorno ${index + 1}`;
  card.querySelector(".card-title").innerText = stage.title;

  card.querySelector(".card-content").innerHTML = `\
<p>
  <b>Luoghi:</b>
  ${stage.places
    .map(function (place) {
      return place.name;
    })
    .join(", ")}
</p>
<p>
  <b>Curiosità:</b>
  ${stage.facts}
</p>`;

  return card;
}

function renderTravelTitle() {
  travel.querySelector(
    ".travel-name"
  ).innerHTML = `Il tuo viaggio a <b>${travelFormData.location}</b>`;
  travel.querySelector(
    ".travel-detail"
  ).innerHTML = `in <b>${travelFormData.season}</b>, <b>${travelFormData.company}</b>`;
}

function renderTravelStages() {
  travelPlan.stages.forEach(function (stage, index) {
    const card = stageComponent(stage, index);
    cards.append(card);
  });
}

function setTravelFormData() {
  const data = new FormData(form);
  travelFormData = Object.fromEntries(data.entries());
}

function setAppState(state) {
  document.documentElement.dataset.state = state;
}

async function makeRequest(endpoint, data) {
  const response = await fetch(OPENAI.API_BASE_URL + endpoint, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI.API_KEY}`,
    },
    method: "POST",
    body: JSON.stringify(data),
  });
  const json = await response.json();
  return json;
}
