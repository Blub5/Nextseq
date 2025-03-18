# NextSeq Web Application

This repository contains a web application for managing NextSeq sequencing workflows, including pool management, calculations, and database operations.

---

## Installation

You can use this application locally or host it on a website/network.

### Local Installation

#### Requirements:
- **XAMPP** (or similar local server environment)
- **VSCode** (or any code editor)
- **Web browser**

#### Installation Steps:
1. Install XAMPP following any standard online guide.
2. Place the files from this repository in `C:\xampp\htdocs\Nextseq` or clone the repository to this location.
3. Ensure Apache and MySQL services are running in XAMPP.

#### Configuration:
The PHP code uses a `config.php` file that is not included in the repository for security reasons. Create a `config.php` file with the following credentials:
<?php define('DB_HOST', 'localhost'); define('DB_USER', 'root'); // default XAMPP username define('DB_PASS', ''); // default XAMPP password define('DB_NAME', 'NGSweb'); ?>


> **Note:** Update the file paths in PHP files to correctly reference the `config.php` file location. For example, use `PHP_Files/config.php` or an absolute path.

Alternatively, you can host this application on an Apache server inside your network or on a website. The setup process is similar, but you need to install Apache, MySQL, PHP, etc., on the hosting device.

---

## Database Setup

1. Open **phpMyAdmin**.
2. Select or create a database named `NGSweb`.
3. Click on the **Import** tab.
4. Choose the provided `NGSweb.sql` file from your computer.
5. Click **Go** to execute the script.

---

## Troubleshooting

If you encounter errors:
- Verify database credentials in `config.php`.
- Check if the database name (`NGSweb`) is correct.
- Ensure all required files are included.
- Confirm that the `config.php` file matches the include paths in PHP files.
- Use browser developer tools (Inspect Element > Console) to identify connection issues.

---

## File Structure

### HTML Files
| File Name              | Description                                                                 |
|------------------------|-----------------------------------------------------------------------------|
| **Calculations.html**  | Provides formulas for calculating mass and molarity for chemical solutions. |
| **Admin.html**         | Contains settings for pools and project configurations.                    |
| **Mixdiffpools.html**  | Spreadsheet for managing sequencing pools.                                 |
| **Database.html**      | Interface for managing database operations.                                |
| **NLP.html**           | Procedural steps for creating and purifying sequencing pools.              |

### CSS Files
| File Name              | Description                                                                 |
|------------------------|-----------------------------------------------------------------------------|
| **Calculations.css**   | Styles the calculator interface layout and functionality.                   |
| **Database.css**       | Provides styling for database-related pages.                                |
| **Mixdiffpools.css**   | Styles spreadsheet-like interfaces for sequencing pools management.         |
| **Admin.css**          | Styles administrative settings pages and configurations.                   |
| **NLP.css**            | Styles procedural sections related to sequencing workflows.                |
| **custom.css**         | Shared styles across multiple pages of the application.                    |

### JavaScript Files
| File Name              | Description                                                                 |
|------------------------|-----------------------------------------------------------------------------|
| **Admin.js**           | Manages application settings and user preferences using local storage.      |
| **Calculations.js**    | Handles scientific calculations related to molarity, mass, and volume conversions. |
| **NLP.js**             | Facilitates calculations for library preparation workflows.                |
| **Database.js**        | Interacts with database tables and manages data operations like export functionality. |
| **Mixdiffpools.js**    | Manages project pools and performs advanced sequencing calculations.        |

### PHP Files
| File Name                      | Description                                                                 |
|--------------------------------|-----------------------------------------------------------------------------|
| **update_preliminary_data.php**| Updates preliminary data in the `mixdiffpools` table after validation of required fields like RunName, ProjectPool, etc. |
| **get_table_data.php**         | Fetches data from specified database tables with optional filtering/sorting functionality. |
| **get_richtlijnen.php**        | Retrieves guidelines from the `richtlijnen` table in JSON format for dynamic usage in UI components. |
| **save_nlp_data.php**          | Inserts NLP-related data into relevant tables after validation of fields such as concentration and library size values. |
| **save_all_data.php**          | Saves multiple rows of data into corresponding tables using batch processing techniques to enhance efficiency during bulk operations. |
| **save_richtlijnen.php**       | Manages records dynamically within guidelines tables based on user input validations or deletions triggered by synchronization events between UI & DB states.|

---

## Hosting

For network or web hosting:
Its the same process just install Apache,MariaDB(phpmyadmin) and it wil work the same
