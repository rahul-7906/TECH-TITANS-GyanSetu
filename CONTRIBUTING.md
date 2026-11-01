# 🤝 Contributing to GyanSetu (ज्ञान सेतु)

First off, thank you for considering contributing to **GyanSetu**! Whether you are fixing a typo, improving mobile responsiveness, optimizing database queries, or adding new question categories, your contributions help thousands of campus peers learn together.

---

## 📜 Code of Conduct
We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please be respectful, constructive, and collaborative in all discussions and pull requests.

---

## 🚀 Getting Started

### 1. Fork & Clone the Repository
```bash
# 1. Fork the repository on GitHub
# 2. Clone your forked repository
git clone https://github.com/your-username/Gyan-Setu.git
cd Gyan-Setu
```

### 2. Configure Environment Variables
```bash
# Copy the example environment variables
cp .env.example .env

# Edit .env with your Supabase credentials
# (Create a free project at https://supabase.com if you don't have one)
```

### 3. Database Setup (Supabase)
1. Open your Supabase project's **SQL Editor**.
2. Run the provided SQL migration script: [`supabase_setup.sql`](./supabase_setup.sql).
3. Ensure **"Confirm email"** is turned OFF in *Authentication -> Providers -> Email* for instantaneous registration.

### 4. Running Locally
GyanSetu is engineered with zero-compilation Vanilla ES6+ and Tailwind CSS. You can run it with any static server:
```bash
# Using Python 3:
python -m http.server 3000

# OR using Node.js npx:
npx serve .

# OR using VS Code:
# Right-click index.html -> "Open with Live Server"
```
Visit `http://localhost:3000` in your browser.

---

## 🛠️ Contribution Workflow

1. **Create a Feature Branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make Clean, Focused Changes:**
   - Follow existing CSS classes (Tailwind CSS 3, Deep Emerald Dark Theme).
   - Ensure mobile responsiveness down to 320px viewport width.
   - Keep JavaScript modular and maintain error handling.
3. **Commit with Clear Messages:**
   ```bash
   git commit -m "feat(arena): add new dynamic graph questions to race engine"
   ```
4. **Push to Your Fork:**
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request:**
   - Target the `main` branch.
   - Describe what changed and include screenshots or GIFs for visual changes.

---

## 🎯 Areas Where We Welcome Help
- 🏎️ **Speed Race Arena:** Expanding question banks with multi-language test runners.
- 📱 **Mobile UI/UX:** Polishing micro-interactions and touch targets.
- 📺 **Collaborative Rooms:** Enhancing whiteboard drawing tools and canvas exports.
- 🛡️ **Escrow Ledger:** Advanced audit views and dispute resolution interfaces.

---

## 📄 License
By contributing to GyanSetu, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
