import { GalleryOptions } from './AbstractGallery';
import { AbstractRowGallery } from './AbstractRowGallery';

export interface ResponsiveGalleryOptions extends GalleryOptions {
    rowHeight: number;
}

export abstract class AbstractResponsiveRowGallery extends AbstractRowGallery {

    constructor(protected elementRef: HTMLElement,
                options: ResponsiveGalleryOptions,
                protected photoswipeElementRef?: HTMLElement,
                protected scrollElementRef?: HTMLElement) {

        super(elementRef, options, photoswipeElementRef, scrollElementRef);

        if (!options.rowHeight || options.rowHeight <= 0) {
            throw new Error('Option.rowHeight must be positive');
        }
    }

    protected addRows(rows: number): void {
        this.completeLastRow();
        super.addRows(rows);
    }

    protected endResize() {
        super.endResize();
        this.completeLastRow();
        this.flushBufferedItems();
    }

    private completeLastRow() {

        if (!this.visibleCollection.length) {
            return;
        }

        // Get last row number
        const lastVisibleRow = this.visibleCollection[this.visibleCollection.length - 1].row;

        // Get number of items in that last row
        const visibleItemsInLastRow = this.visibleCollection.filter(i => i.row === lastVisibleRow).length;

        // Get a list from first item of last row until end of collection
        const collectionFromLastVisibleRow = this.collection.slice(this.visibleCollection.length - visibleItemsInLastRow);
        this.organizeItems(collectionFromLastVisibleRow, collectionFromLastVisibleRow[0].row, collectionFromLastVisibleRow[0].row);
        const itemsToAdd = collectionFromLastVisibleRow.slice(visibleItemsInLastRow)
                                                       .filter(i => i.row <= collectionFromLastVisibleRow[0].row);

        itemsToAdd.forEach(i => this.addItemToDOM(i));
    }

}
