import { Item } from '../Item';
import { GalleryOptions, ModelAttributes } from './AbstractGallery';
import { AbstractRowGallery } from './AbstractRowGallery';

export interface SquareGalleryOptions extends GalleryOptions {
    itemsPerRow: number;
}

export class Square<Model extends ModelAttributes = any> extends AbstractRowGallery {

    /**
     * Options after having been defaulted
     */
    protected options: SquareGalleryOptions;

    constructor(protected elementRef: HTMLElement,
                options: SquareGalleryOptions,
                protected photoswipeElementRef?: HTMLElement,
                protected scrollElementRef?: HTMLElement) {

        super(elementRef, options, photoswipeElementRef, scrollElementRef);

        if (!options.itemsPerRow || options.itemsPerRow <= 0) {
            throw new Error('Option.itemsPerRow must be positive');
        }
    }

    protected getEstimatedItemsPerRow() {
        return this.options.itemsPerRow;
    }

    /**
     * Compute sides with 1:1 ratio
     * @param items
     * @param firstRowIndex
     * @param toRow
     */
    protected organizeItems(items: Item[], firstRowIndex: number = 0, toRow: number = null): void {

        let sideSize = this.getItemSideSize();
        let lastIndex = toRow ? this.options.itemsPerRow * (toRow - firstRowIndex + 1) : items.length;
        lastIndex = lastIndex > items.length ? items.length : lastIndex;

        for (let i = 0; i < lastIndex; i++) {
            let item = items[i];
            item.width = Math.floor(sideSize);
            item.height = Math.floor(sideSize);
            item.last = i % this.options.itemsPerRow === this.options.itemsPerRow - 1;
            item.row = Math.floor(i / this.options.itemsPerRow) + firstRowIndex;
            item.style();
        }
    }

    protected getEstimatedRowsPerPage(): number {
        return Math.ceil(this.getGalleryVisibleHeight() / this.getItemSideSize());
    }

    /**
     * Return square side size
     */
    protected getItemSideSize(): number {
        const itemsPerRow = this.getEstimatedItemsPerRow();
        return (this.width - (itemsPerRow - 1) * this.options.gap) / itemsPerRow;
    }

}
