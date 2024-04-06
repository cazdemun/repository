import { v4 as uuidv4 } from 'uuid';

export type BaseDoc = {
  [key: string]: unknown // Indicates BaseDoc can be indexed with a string, used on read method for shallow queries
  _id: string
}

export type NewDoc<T extends BaseDoc> = Partial<Pick<T, '_id'>> & Omit<T, '_id'>;
export type UpdateManyDoc<T extends BaseDoc> = { _id: string } & Partial<Omit<T, '_id'>>;

export default class Repository<T extends BaseDoc> {
  collection: string;
  verbose: boolean;

  constructor(collection: string, verbose: boolean = false) {
    this.collection = collection;
    this.verbose = verbose;
  }

  /**
   * Reads all items from the collection
   * 
   * @param query Shallow query to filter items
   * @returns Array of items that match the query
   */
  read(query?: Record<string, string>): T[] {
    const items = JSON.parse(localStorage.getItem(this.collection) || '[]');
    if (!query) return items;
    return items.filter((item: T) => Object.entries(query).every(([key, value]) => item[key] === value));
  }

  create(newDocs: NewDoc<T> | (NewDoc<T>[])): T[] {
    const items = this.read();
    const newItems = Array.isArray(newDocs) ? newDocs : [newDocs];
    newItems.forEach((item) => {
      if (!item._id) item._id = uuidv4(); // Generate a unique ID if not provided
    });
    localStorage.setItem(this.collection, JSON.stringify([...items, ...newItems]));
    return newItems as T[];
  }

  update(_id: string, update: Partial<T>): number {
    if (!_id) return 0;
    const items = this.read();
    const index = items.findIndex(item => item._id === _id);
    if (index === -1) return 0;
    const { _id: updateId, ...updateWithoutId } = update; // Ignore _id in update
    
    if (this.verbose) {
      console.warn(`Trying to update item _id: ${_id} with`, updateId);
    }
    
    items[index] = { ...items[index], ...updateWithoutId };
    localStorage.setItem(this.collection, JSON.stringify(items));
    return 1;
  }

  updateMany(docs: UpdateManyDoc<T>[]): number {
    if (docs.length === 0) return 0;
    let count = 0;
    docs.forEach(({ _id, ...doc }) => {
      count += this.update(_id, doc as Partial<T>);
    });
    return count;
  }

  delete(_id: string): number {
    if (!_id) return 0;
    const items = this.read();
    const filteredItems = items.filter((item) => item._id !== _id);
    if (items.length === filteredItems.length) return 0; // No item was deleted
    localStorage.setItem(this.collection, JSON.stringify(filteredItems));
    return 1;
  }

  deleteMany(_ids: string[]): number {
    if (_ids.length === 0) return 0;
    const items = this.read();
    const filteredItems = items.filter((item) => !_ids.includes(item._id));
    const count = items.length - filteredItems.length; // Number of items deleted
    if (count === 0) return 0; // No items were deleted
    localStorage.setItem(this.collection, JSON.stringify(filteredItems));
    return count;
  }
}