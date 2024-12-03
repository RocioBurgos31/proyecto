// Importar módulos necesarios de Firebase
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";
import {
  getDatabase,
  ref as dbRef,
  push,
  set,
  onValue,
  remove,
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAaEmQApj65zftBpVPBjDz10pJPsjFm_NQ",
  authDomain: "ventas-9f734.firebaseapp.com",
  databaseURL: "https://ventas-9f734-default-rtdb.firebaseio.com",
  projectId: "ventas-9f734",
  storageBucket: "ventas-9f734.appspot.com",
  messagingSenderId: "183579140497",
  appId: "1:183579140497:web:366c8ac9e3253d53f83a30",
  measurementId: "G-3FZ1W9FQT0",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const realtimeDB = getDatabase(app);

// Referencias al DOM
const recipeForm = document.getElementById("recipe-form");
const recipesContainer = document.getElementById("recipes-container");

// Guardar en Local Storage
const saveToLocalStorage = (recipes) => {
  localStorage.setItem("recipes", JSON.stringify(recipes));
};

// Obtener de Local Storage
const getFromLocalStorage = () => {
  const storedRecipes = localStorage.getItem("recipes");
  return storedRecipes ? JSON.parse(storedRecipes) : [];
};

// Renderizar recetas
const renderRecipes = (recipes) => {
  recipesContainer.innerHTML = recipes.length
    ? recipes
        .map(
          (recipe) => `
            <div class="recipe bg-light p-3 mb-3 rounded shadow-sm" data-key="${recipe.key}">
              <h5 class="text-primary">${recipe.title}</h5>
              <p><strong>Descripción:</strong> ${recipe.description}</p>
              <p><strong>Ingredientes:</strong> ${recipe.ingredients}</p>
              <p><strong>Pasos:</strong> ${recipe.steps}</p>
              <p><strong>Tiempo:</strong> ${recipe.time} min</p>
              <p><strong>Dificultad:</strong> ${recipe.difficulty}</p>
              <p><strong>Porciones:</strong> ${recipe.portion}</p>
              <button class="btn btn-danger btn-sm delete-btn" data-key="${recipe.key}">Eliminar</button>
            </div>`
        )
        .join("")
    : '<p class="text-muted">No hay recetas guardadas aún.</p>';

  // Añadir eventos para eliminar las recetas
  document.querySelectorAll(".delete-btn").forEach((button) =>
    button.addEventListener("click", async (e) => {
      const recipeKey = e.target.getAttribute("data-key");
      await deleteRecipe(recipeKey);
      fetchAndRenderRecipes();
    })
  );
};

// Eliminar recetas antiguas (corrección del path)
const cleanupOldRecipes = async (daysOld = 30) => {
  const now = Date.now();
  const cutoff = now - daysOld * 24 * 60 * 60 * 1000;

  const snapshot = await new Promise((resolve) =>
    onValue(dbRef(realtimeDB, "recipes"), resolve, { onlyOnce: true })
  );

  snapshot.forEach(async (childSnapshot) => {
    const recipe = childSnapshot.val();
    const recipeDate = new Date(recipe.createdAt).getTime();

    if (recipeDate < cutoff) {
      await remove(dbRef(realtimeDB, `recipes/${childSnapshot.key}`));
    }
  });
};
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then((registration) => {
      console.log('Service Worker registrado con éxito:', registration);
    })
    .catch((error) => {
      console.error('Error al registrar el Service Worker:', error);
    });
}


// Función para eliminar una receta
const deleteRecipe = async (key) => {
  try {
    if (navigator.onLine) {
      await remove(dbRef(realtimeDB, `recipes/${key}`));
    }
    const recipes = getFromLocalStorage().filter((recipe) => recipe.key !== key);
    saveToLocalStorage(recipes);
    alert("Receta eliminada exitosamente.");
  } catch (error) {
    console.error("Error al eliminar la receta:", error);
  }
};

// Control de envíos
let lastSubmissionTime = 0;
const submissionCooldown = 5000;

recipeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const currentTime = Date.now();
  if (currentTime - lastSubmissionTime < submissionCooldown) {
    alert("Por favor, espera unos segundos antes de enviar otra receta.");
    return;
  }
  lastSubmissionTime = currentTime;

  const newRecipe = {
    title: document.getElementById("recipe-title").value,
    description: document.getElementById("recipe-description").value,
    ingredients: document.getElementById("recipe-ingredients").value,
    steps: document.getElementById("recipe-steps").value,
    time: parseInt(document.getElementById("recipe-time").value),
    difficulty: document.getElementById("recipe-difficulty").value,
    portion: parseInt(document.getElementById("recipe-portion").value),
    createdAt: new Date().toISOString(),
  };

  try {
    if (navigator.onLine) {
      const newRecipeRef = push(dbRef(realtimeDB, "recipes"));
      await set(newRecipeRef, newRecipe);

      const recipes = getFromLocalStorage();
      recipes.push({ key: newRecipeRef.key, ...newRecipe });
      saveToLocalStorage(recipes);

      alert("Receta guardada exitosamente.");
    } else {
      const recipes = getFromLocalStorage();
      recipes.push({ key: `local-${Date.now()}`, ...newRecipe });
      saveToLocalStorage(recipes);

      alert("Receta guardada localmente.");
    }

    fetchAndRenderRecipes();
    recipeForm.reset();
  } catch (error) {
    console.error("Error al guardar la receta:", error);
  }
});

// Sincronizar datos locales
const syncLocalDataToFirebase = async () => {
  const localRecipes = getFromLocalStorage().filter((recipe) =>
    recipe.key.startsWith("local-")
  );

  for (const recipe of localRecipes) {
    try {
      const newRecipeRef = push(dbRef(realtimeDB, "recipes"));
      await set(newRecipeRef, recipe);

      recipe.key = newRecipeRef.key;

      const updatedRecipes = getFromLocalStorage().filter(
        (localRecipe) => !localRecipe.key.startsWith("local-")
      );
      saveToLocalStorage(updatedRecipes);
    } catch (error) {
      console.error("Error al sincronizar receta:", recipe, error);
    }
  }
};

// Obtener recetas
const fetchAndRenderRecipes = async () => {
  try {
    if (navigator.onLine) {
      await syncLocalDataToFirebase();
      const recipes = [];
      const snapshot = await new Promise((resolve) =>
        onValue(dbRef(realtimeDB, "recipes"), resolve, { onlyOnce: true })
      );

      snapshot.forEach((childSnapshot) => {
        recipes.push({ key: childSnapshot.key, ...childSnapshot.val() });
      });

      saveToLocalStorage(recipes);
      renderRecipes(recipes);
    } else {
      renderRecipes(getFromLocalStorage());
    }
  } catch (error) {
    console.error("Error al obtener recetas:", error);
    renderRecipes(getFromLocalStorage());
  }
};

window.addEventListener("online", async () => {
  await syncLocalDataToFirebase();
  fetchAndRenderRecipes();
});

window.addEventListener("offline", () => {
  renderRecipes(getFromLocalStorage());
});

document.addEventListener("DOMContentLoaded", () => {
  fetchAndRenderRecipes();
});
