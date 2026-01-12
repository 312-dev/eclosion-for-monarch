/**
 * Custom type declarations for electron-store v11
 *
 * electron-store v11 is ESM-only with complex generics that don't work well
 * with CommonJS module resolution. This declaration provides a simplified
 * interface that matches our usage patterns.
 *
 * The actual runtime behavior is handled by esbuild which bundles ESM to CJS.
 */

declare module 'electron-store' {
  export interface Options<T extends Record<string, unknown>> {
    defaults?: Partial<T>;
    name?: string;
    cwd?: string;
    encryptionKey?: string | Buffer;
    clearInvalidConfig?: boolean;
    serialize?: (value: T) => string;
    deserialize?: (text: string) => T;
    accessPropertiesByDotNotation?: boolean;
    watch?: boolean;
  }

  export default class Store<T extends Record<string, unknown> = Record<string, unknown>> {
    constructor(options?: Options<T>);

    /**
     * Get an item from the store.
     */
    get<K extends keyof T>(key: K): T[K];
    get<K extends keyof T>(key: K, defaultValue: T[K]): T[K];
    get(key: string): unknown;
    get(key: string, defaultValue: unknown): unknown;

    /**
     * Set an item in the store.
     */
    set<K extends keyof T>(key: K, value: T[K]): void;
    set(key: string, value: unknown): void;
    set(object: Partial<T>): void;

    /**
     * Check if an item exists in the store.
     */
    has<K extends keyof T>(key: K): boolean;
    has(key: string): boolean;

    /**
     * Delete an item from the store.
     */
    delete<K extends keyof T>(key: K): void;
    delete(key: string): void;

    /**
     * Delete all items from the store.
     */
    clear(): void;

    /**
     * Get the path to the storage file.
     */
    readonly path: string;

    /**
     * Get all items as an object.
     */
    readonly store: T;

    /**
     * Get the number of items in the store.
     */
    readonly size: number;

    /**
     * Open the storage file in the user's editor.
     */
    openInEditor(): Promise<void>;

    /**
     * Initialize renderer process communication.
     */
    static initRenderer(): void;
  }
}
