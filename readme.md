# TACO Builder 🛠️

**TACO (Template Assistance Call Output)** Builder is a powerful, browser-based tool designed to create, manage, and use dynamic form templates. It streamlines the process of generating consistent, pre-formatted text outputs for call logs, case notes, or any repetitive data entry task.

All data, including form designs (blueprints) and log history, is stored locally in your browser's IndexedDB. No information is ever sent to a server.

## ✨ Features

- **Intuitive Form Builder:** Create complex forms with a simple point-and-click interface.
- **Live Preview:** See a real-time preview of both your form and the final text output as you build it.
- **Multiple Field Types:**
  - Text Input
  - Text Area
  - Searchable Dropdown (with single or multi-select tag modes)
  - Checkboxes
  - Static Text (for instructions or dividers)
- **Drag & Drop:** Easily reorder form fields to get the perfect layout.
- **Local Blueprint Storage:** Save and load your form designs (blueprints) directly in your browser.
- **Case Logging & History:** Automatically log every copied output and review your history.
- **Search & Download Logs:** Search your log history and download it as a `.csv` file for reporting.
- **Import / Export Blueprints:**
  - **Export to JSON:** Save a blueprint's design to a file for backup or to share with colleagues.
  - **Import from JSON:** Load a blueprint design from a file.
- **Export Standalone Form:** Generate a self-contained, usable HTML file of your form that can be shared and used by anyone, even without the TACO Builder.

---

## 🚀 How to Use

Simply open the `taco-builder.html` file in a modern web browser like Chrome, Firefox, or Edge.

### 1. Building Your First Blueprint

A **Blueprint** is the design for your form.

1.  **Set Form Details:** On the left panel, give your form a `Form Name` and an optional `Form Subtitle`.
2.  **Add Fields:** Use the "Add..." buttons to add fields to your form. They will appear in the "Form Fields" list and the live preview on the right.
3.  **Configure Fields:**
    - Click the **pencil icon (✏️)** next to any field in the list to open the edit modal.
    - In the modal, you can set the `Field Label`, make it `required`, add `placeholder text`, and manage options for dropdowns/checkboxes.
    - For **Searchable Dropdowns**, you can enable `multi-select` to allow users to choose multiple options as tags.
    - For **Static Text**, you can add helpful `Tooltip Information` that appears on hover.
4.  **Reorder Fields:** Click and drag the **drag handle (⠿)** on any field to change its position.
5.  **Save the Blueprint:** Click the **"Save Blueprint"** button in the header. This saves the design to your browser's local storage for future use.

### 2. Using a Form

1.  **Load a Blueprint:** Select a saved blueprint from the dropdown menu in the header.
2.  **Fill Out the Form:** Use the live preview form on the right to enter your data. The "Output Preview" below it will update in real-time.
3.  **Copy & Log:** When you're done, click **"Copy & Log"**. This does two things:
    - Copies the generated output to your clipboard.
    - Creates a timestamped entry in the "Log History" for the current blueprint.
    - The form is automatically cleared, ready for the next case.
4.  **Clear Form:** Click **"Clear Form"** at any time to reset all fields in the live preview.

### 3. Managing Blueprints

- **Load:** Select a blueprint from the dropdown in the header to load it into the builder.
- **Duplicate:** Load a blueprint, then click the **"Duplicate"** button. This creates an unsaved copy, allowing you to make a new version without starting from scratch.
- **Export (JSON):** Click **"Export Blueprint"** to save the current form design as a `.json` file. This is useful for backups or sharing with others who use the TACO Builder.
- **Import (JSON):** Click **"Import Blueprint"** to load a `.json` file. The imported form will be loaded as a new, unsaved blueprint. Remember to save it!

### 4. Exporting a Usable Form (HTML)

The **"Export Usable Form"** button is one of the most powerful features. It packages your current blueprint into a single, standalone `.html` file.

- This file can be opened by anyone in a web browser.
- It contains only the form and the output generator.
- It does *not* include the builder interface or logging features.
- This is the perfect way to distribute your finished template to a team for them to use.

### 5. Log History

The log history is unique to each saved blueprint.

- **View Logs:** Logs for the currently loaded blueprint are shown at the bottom right. Click on a log entry's header to expand/collapse its full output.
- **Search:** Use the search bar to filter logs based on their content.
- **Copy/Delete:** Each log entry has buttons to copy its content again or to permanently delete it.
- **Download Log:** Click **"Download Log"** to export the *entire* log history for the current blueprint as a `.csv` file, which can be opened in Excel or Google Sheets.

---

## 🛠️ Technical Details

This project is built with vanilla web technologies, ensuring it's fast, portable, and has no complex dependencies.

- **HTML5**
- **CSS3** (with CSS Variables for theming)
- **JavaScript (ES6+)**
- **Dexie.js:** A minimalist wrapper for IndexedDB that handles all local database storage for blueprints and logs.
- **SortableJS:** A lightweight library for handling the drag-and-drop reordering of fields.