/**
 * Pagination Options Configuration
 * This file is a part of Media Pi frontend application
 * 
 * Defines the standardized options for items-per-page selectors across
 * the application. These options are used in data tables, lists, and
 * other paginated components to provide consistent pagination behavior.
 * 
 * Standard Options:
 * - Small sets: 10 items (ideal for detailed views)
 * - Medium sets: 25 items (balanced performance/usability)
 * - Large sets: 50 items (for power users)
 * - All items: -1 value (shows all available items)
 * 
 * The "All" option uses -1 as per Vuetify conventions for showing
 * all items without pagination.
 * 
 * @module ItemsPerPage
 * @author Maxim Samsonov
 * @since 2025
 */

/**
 * Standardized items-per-page options for pagination components
 * 
 * This configuration is used across all data tables and lists to ensure
 * consistent pagination behavior. The values are optimized for:
 * - Performance: Reasonable page sizes to avoid loading too much data
 * - Usability: Common pagination sizes that users expect
 * - Accessibility: Russian labels for the user interface
 * 
 * @type {Array<Object>}
 * 
 * @example
 * // In a data table component
 * <v-data-table
 *   :items-per-page-options="itemsPerPageOptions"
 *   :items-per-page="25"
 * >
 *   <!-- table content -->
 * </v-data-table>
 * 
 * // In a custom pagination component
 * <v-select
 *   :items="itemsPerPageOptions"
 *   v-model="itemsPerPage"
 *   item-title="title"
 *   item-value="value"
 * />
 */
export const itemsPerPageOptions = [
  { value: 10, title: '10' },   // Small page size for detailed viewing
  { value: 25, title: '25' },   // Default page size - good balance
  { value: 50, title: '50' },   // Large page size for power users
  { value: -1, title: 'Все' }   // Show all items (Russian: "All")
]
