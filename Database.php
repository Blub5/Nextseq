<?php
class Database {
    private $conn;
    private static $instance = null;

    private function __construct($config) {
        try {
            $this->conn = new mysqli(
                $config['host'],
                $config['user'],
                $config['pass'],
                $config['name']
            );

            if ($this->conn->connect_error) {
                throw new Exception("Connection failed");
            }

            $this->conn->set_charset("utf8mb4");
        } catch (Exception $e) {
            error_log($e->getMessage());
            throw new Exception("Database connection error");
        }
    }

    public static function getInstance($config) {
        if (self::$instance === null) {
            self::$instance = new self($config);
        }
        return self::$instance;
    }

    public function query($sql, $params = [], $types = '') {
        try {
            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Query preparation failed");
            }
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            if (!$stmt->execute()) {
                throw new Exception("Query execution failed");
            }
            $result = $stmt->get_result();
            $stmt->close();
            return $result;
        } catch (Exception $e) {
            error_log($e->getMessage());
            throw new Exception("Database query error");
        }
    }

    public function beginTransaction() {
        $this->conn->begin_transaction();
    }

    public function commit() {
        $this->conn->commit();
    }

    public function rollback() {
        $this->conn->rollback();
    }

    public function close() {
        $this->conn->close();
    }
}