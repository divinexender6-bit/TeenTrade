
import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// ==========================================
// TEENTRADE - MAIN APPLICATION
// Firebase Authentication + Firestore
// Product photos use public image URLs.
// ==========================================

const $ = (selector) => document.querySelector(selector);

const productsGrid =
  $("#productsGrid") ||
  $("#productGrid") ||
  $("#products");

const searchInput =
  $("#searchInput") ||
  $("#search");

const categoryFilter =
  $("#categoryFilter") ||
  $("#category");

const loginForm = $("#loginForm");
const registerForm = $("#registerForm");
const productForm = $("#productForm");

const logoutButton =
  $("#logoutBtn") ||
  $("#logoutButton") ||
  $("#logout");

const currentUserDisplay =
  $("#currentUser") ||
  $("#userEmail");

const authMessage = $("#authMessage");
const productMessage = $("#productMessage");

let currentUser = null;
let allProducts = [];
let unsubscribeProducts = null;

// ------------------------------------------
// DISPLAY MESSAGES
// ------------------------------------------

function showMessage(element, message, isError = false) {
  if (!element) {
    console.log(message);
    return;
  }

  element.textContent = message;
  element.style.color = isError ? "#ff6b81" : "#58e6a9";
}

function setAuthMessage(message, isError = false) {
  showMessage(authMessage, message, isError);
}

function setProductMessage(message, isError = false) {
  showMessage(productMessage, message, isError);
}

// ------------------------------------------
// SAFE FORM VALUE HELPERS
// ------------------------------------------

function formValue(form, ...names) {
  for (const name of names) {
    const field =
      form?.elements.namedItem(name) ||
      form?.querySelector(`[name="${name}"]`) ||
      form?.querySelector(`#${name}`);

    if (field && typeof field.value === "string") {
      return field.value.trim();
    }
  }

  return "";
}

function normaliseImageUrl(value) {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

// ------------------------------------------
// REGISTER
// Expected form ID: registerForm
// Expected field names: email, password
// ------------------------------------------

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = formValue(registerForm, "email");
    const password = formValue(registerForm, "password");

    if (!email || !password) {
      setAuthMessage("Enter your email and password.", true);
      return;
    }

    try {
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      registerForm.reset();
      setAuthMessage("Account created successfully!");
    } catch (error) {
      setAuthMessage(error.message, true);
    }
  });
}

// ------------------------------------------
// LOGIN
// Expected form ID: loginForm
// Expected field names: email, password
// ------------------------------------------

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = formValue(loginForm, "email");
    const password = formValue(loginForm, "password");

    if (!email || !password) {
      setAuthMessage("Enter your email and password.", true);
      return;
    }

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      loginForm.reset();
      setAuthMessage("Welcome back to TeenTrade!");
    } catch (error) {
      setAuthMessage(error.message, true);
    }
  });
}

// ------------------------------------------
// LOGOUT
// ------------------------------------------

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    try {
      await signOut(auth);
      setAuthMessage("You have logged out.");
    } catch (error) {
      setAuthMessage(error.message, true);
    }
  });
}

// ------------------------------------------
// CREATE A PRODUCT LISTING
//
// Firestore rules expect:
// name, description, price, category,
// imageUrl, ownerUid
//
// Expected form ID: productForm
// Expected field names:
// name, description, price, category, imageUrl
// ------------------------------------------

if (productForm) {
  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      setProductMessage(
        "Please log in before posting a product.",
        true
      );
      return;
    }

    const name = formValue(productForm, "name", "productName");
    const description = formValue(
      productForm,
      "description"
    );
    const priceText = formValue(productForm, "price");
    const category = formValue(productForm, "category");
    const imageText = formValue(
      productForm,
      "imageUrl",
      "imageURL",
      "image"
    );

    const price = Number(priceText);
    const imageUrl = normaliseImageUrl(imageText);

    if (!name || !description || !priceText || !category) {
      setProductMessage(
        "Please complete all product fields.",
        true
      );
      return;
    }

    if (name.length > 80) {
      setProductMessage(
        "Product names must be 80 characters or fewer.",
        true
      );
      return;
    }

    if (description.length > 1000) {
      setProductMessage(
        "Descriptions must be 1000 characters or fewer.",
        true
      );
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setProductMessage("Enter a valid price.", true);
      return;
    }

    if (!imageUrl) {
      setProductMessage(
        "Enter a valid HTTP or HTTPS image URL.",
        true
      );
      return;
    }

    try {
      await addDoc(collection(db, "products"), {
        name,
        description,
        price,
        category,
        imageUrl,
        ownerUid: currentUser.uid,
        createdAt: Date.now()
      });

      productForm.reset();

      setProductMessage(
        "Your product listing has been published!"
      );
    } catch (error) {
      console.error("Product creation failed:", error);

      setProductMessage(
        "Could not publish the listing. Check your Firebase rules and connection.",
        true
      );
    }
  });
}

// ------------------------------------------
// RENDER PRODUCT CARDS
// ------------------------------------------

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";

  const image = document.createElement("img");
  image.className = "product-image";
  image.src = product.imageUrl;
  image.alt = product.name;
  image.loading = "lazy";
  image.referrerPolicy = "no-referrer";

  image.addEventListener("error", () => {
    image.alt = "Product image unavailable";
    image.removeAttribute("src");
    image.classList.add("image-unavailable");
  });

  const details = document.createElement("div");
  details.className = "product-details";

  const title = document.createElement("h3");
  title.textContent = product.name;

  const price = document.createElement("p");
  price.className = "product-price";
  price.textContent = `K${Number(product.price).toFixed(2)}`;

  const category = document.createElement("p");
  category.className = "product-category";
  category.textContent = product.category;

  const description = document.createElement("p");
  description.className = "product-description";
  description.textContent = product.description;

  details.append(title, price, category, description);

  if (currentUser && product.ownerUid === currentUser.uid) {
    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "delete-product";
    deleteButton.textContent = "Delete listing";

    deleteButton.addEventListener("click", async () => {
      const confirmed = window.confirm(
        "Are you sure you want to delete this listing?"
      );

      if (!confirmed) return;

      try {
        await deleteDoc(doc(db, "products", product.id));
        setProductMessage("Listing deleted.");
      } catch (error) {
        console.error("Delete failed:", error);

        setProductMessage(
          "Could not delete this listing.",
          true
        );
      }
    });

    details.appendChild(deleteButton);
  }

  card.append(image, details);
  return card;
}

// ------------------------------------------
// SEARCH AND CATEGORY FILTER
// ------------------------------------------

function renderProducts() {
  if (!productsGrid) {
    console.warn(
      "Product container not found. Check index.html for #productsGrid."
    );
    return;
  }

  const searchTerm = (searchInput?.value || "")
    .trim()
    .toLowerCase();

  const selectedCategory = categoryFilter?.value || "all";

  const filteredProducts = allProducts.filter((product) => {
    const searchableText = [
      product.name,
      product.description,
      product.category
    ].join(" ").toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm);

    const matchesCategory =
      selectedCategory === "all" ||
      selectedCategory === "" ||
      product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  productsGrid.replaceChildren();

  if (filteredProducts.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-products";
    emptyMessage.textContent = allProducts.length === 0
      ? "No products listed yet. Be the first to post one!"
      : "No products match your search.";

    productsGrid.appendChild(emptyMessage);
    return;
  }

  filteredProducts.forEach((product) => {
    productsGrid.appendChild(createProductCard(product));
  });
}

searchInput?.addEventListener("input", renderProducts);
categoryFilter?.addEventListener("change", renderProducts);

// ------------------------------------------
// LOAD PRODUCTS FROM FIRESTORE
// ------------------------------------------

function startProductListener() {
  if (unsubscribeProducts) {
    unsubscribeProducts();
  }

  const productsQuery = query(
    collection(db, "products"),
    orderBy("createdAt", "desc")
  );

  unsubscribeProducts = onSnapshot(
    productsQuery,
    (snapshot) => {
      allProducts = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      renderProducts();
    },
    (error) => {
      console.error("Could not load products:", error);

      if (productsGrid) {
        productsGrid.textContent =
          "Could not load products. Check your internet connection and Firestore rules.";
      }
    }
  );
}

// ------------------------------------------
// AUTHENTICATION STATE
// ------------------------------------------

onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (currentUserDisplay) {
    currentUserDisplay.textContent = user
      ? user.email
      : "Not logged in";
  }

  if (logoutButton) {
    logoutButton.hidden = !user;
  }

  if (productForm) {
    productForm.hidden = !user;
  }

  renderProducts();
});

// Start listening for product listings.
startProductListener();
