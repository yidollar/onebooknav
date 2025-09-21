<?php
/**
 * Bookmark Management System
 * Handles categories and bookmarks with hierarchical structure
 */

require_once __DIR__ . '/Database.php';

class BookmarkManager {
    private $db;
    private $currentUserId;

    public function __construct($userId = null) {
        $this->db = Database::getInstance();
        $this->currentUserId = $userId;
    }

    // Category Management

    /**
     * Get all categories for a user
     */
    public function getCategories($userId = null, $includePrivate = true) {
        $userId = $userId ?? $this->currentUserId;

        $sql = "SELECT * FROM categories WHERE user_id = ?";
        $params = [$userId];

        if (!$includePrivate) {
            $sql .= " AND is_private = 0";
        }

        $sql .= " ORDER BY parent_id, weight, name";

        $categories = $this->db->fetchAll($sql, $params);
        return $this->buildCategoryTree($categories);
    }

    /**
     * Get public categories for guest view
     */
    public function getPublicCategories() {
        $sql = "SELECT c.*, u.username FROM categories c
                JOIN users u ON c.user_id = u.id
                WHERE c.is_private = 0
                ORDER BY c.parent_id, c.weight, c.name";

        $categories = $this->db->fetchAll($sql);
        return $this->buildCategoryTree($categories);
    }

    /**
     * Create a new category
     */
    public function createCategory($name, $parentId = null, $icon = null, $color = null, $isPrivate = false) {
        if (empty($name)) {
            throw new Exception('Category name is required');
        }

        // Get next weight
        $weight = $this->getNextCategoryWeight($parentId);

        $categoryId = $this->db->insert('categories', [
            'name' => $name,
            'parent_id' => $parentId,
            'user_id' => $this->currentUserId,
            'icon' => $icon,
            'color' => $color,
            'weight' => $weight,
            'is_private' => $isPrivate ? 1 : 0
        ]);

        return $this->getCategory($categoryId);
    }

    /**
     * Update category
     */
    public function updateCategory($categoryId, $data) {
        $category = $this->getCategory($categoryId);

        if (!$category || $category['user_id'] != $this->currentUserId) {
            throw new Exception('Category not found or access denied');
        }

        $allowedFields = ['name', 'parent_id', 'icon', 'color', 'weight', 'is_private'];
        $updateData = [];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (empty($updateData)) {
            return false;
        }

        // Prevent circular references in parent_id
        if (isset($updateData['parent_id']) && $updateData['parent_id']) {
            if ($this->wouldCreateCircular($categoryId, $updateData['parent_id'])) {
                throw new Exception('Invalid parent category - would create circular reference');
            }
        }

        return $this->db->update('categories', $updateData, 'id = ?', [$categoryId]);
    }

    /**
     * Delete category and move bookmarks to parent or uncategorized
     */
    public function deleteCategory($categoryId) {
        $category = $this->getCategory($categoryId);

        if (!$category || $category['user_id'] != $this->currentUserId) {
            throw new Exception('Category not found or access denied');
        }

        $this->db->beginTransaction();

        try {
            // Move child categories to parent
            $this->db->update('categories', [
                'parent_id' => $category['parent_id']
            ], 'parent_id = ?', [$categoryId]);

            // Get or create "Uncategorized" category
            $uncategorizedId = $this->getOrCreateUncategorizedCategory();

            // Move bookmarks to uncategorized
            $this->db->update('bookmarks', [
                'category_id' => $uncategorizedId
            ], 'category_id = ?', [$categoryId]);

            // Delete the category
            $this->db->delete('categories', 'id = ?', [$categoryId]);

            $this->db->commit();
            return true;

        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * Reorder categories
     */
    public function reorderCategories($categoryIds) {
        if (!is_array($categoryIds)) {
            throw new Exception('Invalid category order data');
        }

        $this->db->beginTransaction();

        try {
            foreach ($categoryIds as $index => $categoryId) {
                $this->db->update('categories', [
                    'weight' => $index
                ], 'id = ? AND user_id = ?', [$categoryId, $this->currentUserId]);
            }

            $this->db->commit();
            return true;

        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    // Bookmark Management

    /**
     * Get bookmarks by category
     */
    public function getBookmarksByCategory($categoryId, $includePrivate = true) {
        $sql = "SELECT * FROM bookmarks WHERE category_id = ?";
        $params = [$categoryId];

        if (!$includePrivate) {
            $sql .= " AND is_private = 0";
        }

        $sql .= " ORDER BY weight, title";

        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Get all bookmarks for a user
     */
    public function getUserBookmarks($userId = null, $includePrivate = true) {
        $userId = $userId ?? $this->currentUserId;

        $sql = "SELECT b.*, c.name as category_name FROM bookmarks b
                JOIN categories c ON b.category_id = c.id
                WHERE b.user_id = ?";
        $params = [$userId];

        if (!$includePrivate) {
            $sql .= " AND b.is_private = 0";
        }

        $sql .= " ORDER BY c.weight, c.name, b.weight, b.title";

        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Search bookmarks
     */
    public function searchBookmarks($query, $userId = null, $includePrivate = true) {
        $userId = $userId ?? $this->currentUserId;

        $sql = "SELECT b.*, c.name as category_name FROM bookmarks b
                JOIN categories c ON b.category_id = c.id
                WHERE b.user_id = ? AND (
                    b.title LIKE ? OR
                    b.url LIKE ? OR
                    b.description LIKE ? OR
                    b.keywords LIKE ?
                )";

        $searchTerm = '%' . $query . '%';
        $params = [$userId, $searchTerm, $searchTerm, $searchTerm, $searchTerm];

        if (!$includePrivate) {
            $sql .= " AND b.is_private = 0";
        }

        $sql .= " ORDER BY b.click_count DESC, b.title";

        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Create a new bookmark
     */
    public function createBookmark($title, $url, $categoryId, $description = null, $keywords = null, $isPrivate = false) {
        if (empty($title) || empty($url)) {
            throw new Exception('Title and URL are required');
        }

        // Validate URL
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            throw new Exception('Invalid URL format');
        }

        // Check if category exists and belongs to user
        $category = $this->getCategory($categoryId);
        if (!$category || $category['user_id'] != $this->currentUserId) {
            throw new Exception('Invalid category');
        }

        // Check for duplicate URL in user's bookmarks
        if ($this->bookmarkExists($url)) {
            throw new Exception('Bookmark with this URL already exists');
        }

        // Get next weight
        $weight = $this->getNextBookmarkWeight($categoryId);

        // Try to fetch icon
        $iconUrl = $this->fetchFavicon($url);

        $bookmarkId = $this->db->insert('bookmarks', [
            'title' => $title,
            'url' => $url,
            'description' => $description,
            'keywords' => $keywords,
            'icon_url' => $iconUrl,
            'category_id' => $categoryId,
            'user_id' => $this->currentUserId,
            'weight' => $weight,
            'is_private' => $isPrivate ? 1 : 0
        ]);

        return $this->getBookmark($bookmarkId);
    }

    /**
     * Update bookmark
     */
    public function updateBookmark($bookmarkId, $data) {
        $bookmark = $this->getBookmark($bookmarkId);

        if (!$bookmark || $bookmark['user_id'] != $this->currentUserId) {
            throw new Exception('Bookmark not found or access denied');
        }

        $allowedFields = ['title', 'url', 'description', 'keywords', 'category_id', 'weight', 'is_private'];
        $updateData = [];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (empty($updateData)) {
            return false;
        }

        // Validate URL if being updated
        if (isset($updateData['url']) && !filter_var($updateData['url'], FILTER_VALIDATE_URL)) {
            throw new Exception('Invalid URL format');
        }

        // Validate category if being updated
        if (isset($updateData['category_id'])) {
            $category = $this->getCategory($updateData['category_id']);
            if (!$category || $category['user_id'] != $this->currentUserId) {
                throw new Exception('Invalid category');
            }
        }

        $updateData['updated_at'] = date('Y-m-d H:i:s');

        return $this->db->update('bookmarks', $updateData, 'id = ?', [$bookmarkId]);
    }

    /**
     * Delete bookmark
     */
    public function deleteBookmark($bookmarkId) {
        $bookmark = $this->getBookmark($bookmarkId);

        if (!$bookmark || $bookmark['user_id'] != $this->currentUserId) {
            throw new Exception('Bookmark not found or access denied');
        }

        return $this->db->delete('bookmarks', 'id = ?', [$bookmarkId]);
    }

    /**
     * Increment bookmark click count
     */
    public function incrementClickCount($bookmarkId) {
        return $this->db->update('bookmarks', [
            'click_count' => 'click_count + 1'
        ], 'id = ?', [$bookmarkId]);
    }

    /**
     * Reorder bookmarks within a category
     */
    public function reorderBookmarks($bookmarkIds) {
        if (!is_array($bookmarkIds)) {
            throw new Exception('Invalid bookmark order data');
        }

        $this->db->beginTransaction();

        try {
            foreach ($bookmarkIds as $index => $bookmarkId) {
                $this->db->update('bookmarks', [
                    'weight' => $index
                ], 'id = ? AND user_id = ?', [$bookmarkId, $this->currentUserId]);
            }

            $this->db->commit();
            return true;

        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    // Helper methods

    private function getCategory($categoryId) {
        return $this->db->fetchOne("SELECT * FROM categories WHERE id = ?", [$categoryId]);
    }

    private function getBookmark($bookmarkId) {
        return $this->db->fetchOne("SELECT * FROM bookmarks WHERE id = ?", [$bookmarkId]);
    }

    private function buildCategoryTree($categories) {
        $tree = [];
        $lookup = [];

        // First pass: create lookup array and initialize children
        foreach ($categories as $category) {
            $category['children'] = [];
            $lookup[$category['id']] = $category;
        }

        // Second pass: build tree structure
        foreach ($lookup as $id => $category) {
            if ($category['parent_id'] === null) {
                $tree[] = &$lookup[$id];
            } else {
                $lookup[$category['parent_id']]['children'][] = &$lookup[$id];
            }
        }

        return $tree;
    }

    private function getNextCategoryWeight($parentId) {
        $result = $this->db->fetchOne(
            "SELECT MAX(weight) as max_weight FROM categories WHERE parent_id = ? AND user_id = ?",
            [$parentId, $this->currentUserId]
        );
        return ($result['max_weight'] ?? 0) + 1;
    }

    private function getNextBookmarkWeight($categoryId) {
        $result = $this->db->fetchOne(
            "SELECT MAX(weight) as max_weight FROM bookmarks WHERE category_id = ? AND user_id = ?",
            [$categoryId, $this->currentUserId]
        );
        return ($result['max_weight'] ?? 0) + 1;
    }

    private function wouldCreateCircular($categoryId, $newParentId) {
        $currentId = $newParentId;

        while ($currentId !== null) {
            if ($currentId == $categoryId) {
                return true;
            }

            $parent = $this->db->fetchOne(
                "SELECT parent_id FROM categories WHERE id = ?",
                [$currentId]
            );

            $currentId = $parent ? $parent['parent_id'] : null;
        }

        return false;
    }

    private function getOrCreateUncategorizedCategory() {
        $uncategorized = $this->db->fetchOne(
            "SELECT id FROM categories WHERE name = 'Uncategorized' AND user_id = ? AND parent_id IS NULL",
            [$this->currentUserId]
        );

        if ($uncategorized) {
            return $uncategorized['id'];
        }

        // Create uncategorized category
        return $this->db->insert('categories', [
            'name' => 'Uncategorized',
            'user_id' => $this->currentUserId,
            'icon' => 'fas fa-folder',
            'weight' => 999999 // Put it at the end
        ]);
    }

    private function bookmarkExists($url) {
        $result = $this->db->fetchOne(
            "SELECT id FROM bookmarks WHERE url = ? AND user_id = ?",
            [$url, $this->currentUserId]
        );
        return $result !== false;
    }

    private function fetchFavicon($url) {
        try {
            $parsedUrl = parse_url($url);
            $faviconUrl = $parsedUrl['scheme'] . '://' . $parsedUrl['host'] . '/favicon.ico';

            // Simple check if favicon exists
            $headers = @get_headers($faviconUrl);
            if ($headers && strpos($headers[0], '200') !== false) {
                return $faviconUrl;
            }
        } catch (Exception $e) {
            // Ignore errors
        }

        return null;
    }

    /**
     * Check bookmark links for dead links
     */
    public function checkBookmarkStatus($bookmarkId) {
        $bookmark = $this->getBookmark($bookmarkId);

        if (!$bookmark) {
            return false;
        }

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $bookmark['url']);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_USERAGENT, LINK_CHECK_USER_AGENT);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        curl_exec($ch);
        $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        // Update bookmark status
        $this->db->update('bookmarks', [
            'status_code' => $statusCode,
            'last_checked' => date('Y-m-d H:i:s')
        ], 'id = ?', [$bookmarkId]);

        return $statusCode;
    }

    /**
     * Get statistics for user's bookmarks
     */
    public function getStats($userId = null) {
        $userId = $userId ?? $this->currentUserId;

        $stats = [];

        // Total bookmarks
        $result = $this->db->fetchOne(
            "SELECT COUNT(*) as total FROM bookmarks WHERE user_id = ?",
            [$userId]
        );
        $stats['total_bookmarks'] = $result['total'];

        // Total categories
        $result = $this->db->fetchOne(
            "SELECT COUNT(*) as total FROM categories WHERE user_id = ?",
            [$userId]
        );
        $stats['total_categories'] = $result['total'];

        // Private bookmarks
        $result = $this->db->fetchOne(
            "SELECT COUNT(*) as total FROM bookmarks WHERE user_id = ? AND is_private = 1",
            [$userId]
        );
        $stats['private_bookmarks'] = $result['total'];

        // Dead links (status code >= 400)
        $result = $this->db->fetchOne(
            "SELECT COUNT(*) as total FROM bookmarks WHERE user_id = ? AND status_code >= 400",
            [$userId]
        );
        $stats['dead_links'] = $result['total'];

        return $stats;
    }
}
?>