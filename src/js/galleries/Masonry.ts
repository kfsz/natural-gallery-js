// @ts-ignore
import PhotoSwipeLightbox from "photoswipe/lightbox";
import PhotoSwipe from "photoswipe";

import { Column } from '../Column';
import { Item } from '../Item';
import { getImageRatio, RatioLimits } from '../Utility';
import { AbstractGallery, GalleryOptions, ModelAttributes } from './AbstractGallery';


export interface MasonryGalleryOptions extends GalleryOptions {
    columnWidth: number;
    ratioLimit?: RatioLimits;
}

export class Masonry<Model extends ModelAttributes = ModelAttributes> extends AbstractGallery<Model> {

    /**
     * Options after having been defaulted
     */
    protected options!: Required<MasonryGalleryOptions>;

    /**
     * Regroup the list of columns
     */
    protected columns: Column<Model>[] = [];

    constructor(elementRef: HTMLElement,
        options: MasonryGalleryOptions,
        scrollElementRef?: HTMLElement | null) {

        super(elementRef, options, scrollElementRef);

        if (!options.columnWidth || options.columnWidth <= 0) {
            throw new Error('Option.columnWidth must be positive');
        }

    }

    /**
     * Compute sides with 1:1 ratio
     */
    public static organizeItems<T extends ModelAttributes>(gallery: Masonry<T>, items: Item<T>[], fromIndex = 0, toIndex: number | null = null): void {

        const itemsPerRow = gallery.getEstimatedColumnsPerRow();

        // Compute columnWidth of pictures
        const columnWidth = gallery.getColumnWidth();

        let lastIndex = toIndex ? itemsPerRow * (toIndex - fromIndex + 1) : items.length;
        lastIndex = lastIndex > items.length ? items.length : lastIndex;

        for (let i = 0; i < lastIndex; i++) {
            const item = items[i];
            const ratio = getImageRatio(item.model, gallery.options.ratioLimit);

            item.last = true;
            item.width = Math.floor(columnWidth);
            item.height = item.width / ratio;
            item.style(); // todo : externalise to split dom manipulation and logic computing
        }
    }

    public init(): void {
        super.init();

        /**
         * Setup scroll detection to prevent empty zones due to different heights
         */
        if (!this.options.infiniteScrollOffset) {

            let ratio = 0.5; // Portrait format to maximize estimated height

            // Better prediction using ratio if provided
            if (this.options.ratioLimit && this.options.ratioLimit.min) {
                ratio = this.options.ratioLimit.min;
            }

            const columnWidth = this.getColumnWidth();

            this.options.infiniteScrollOffset = -1 * columnWidth / ratio;
        }

    }

    /**
     * https://photoswipe.com/data-sources/#separate-dom-and-data
     * we are not able to infer which picture goes after which from DOM (in masonry mode)
     * (children selector option would select all images in first column first, then second, and so on)
     * so, to keep proper image order, we have to create and keep array with all photoswipe items manually
     */
    private photoswipeItems: any[] = []

    protected photoswipeInit() {
        this.psLightbox = new PhotoSwipeLightbox({
            ...this.options.photoSwipeOptions,
            pswpModule: PhotoSwipe,
        });

        this.psLightbox.addFilter('thumbEl', (thumbEl: any, data: any, _index: number): any => {
            return data.elementReference || thumbEl
        });

        this.psLightbox.addFilter('numItems', (_numItems: any) => {
            return this.photoswipeItems.length;
        });

        this.psLightbox.addFilter('itemData', (_itemData: any, index: number) => {
            return this.photoswipeItems[index];
        });

        this.psLightbox.init();
    }


    public addItemToPhotoswipeCollection(item: Item<Model>) {
        let photoswipeId = this.photoswipeItems.length

        this.photoswipeItems.push({
            id: photoswipeId,
            src: item.model.enlargedSrc,
            width: item.model.enlargedWidth,
            height: item.model.enlargedHeight,
            msrc: item.model.thumbnailSrc,
            elementReference: item.element,
        })

        item.element.addEventListener('zoom', (_ev: any) => {
            this.psLightbox.loadAndOpen(photoswipeId)
        });
    }

    public organizeItems(items: Item<Model>[], fromRow?: number, toRow?: number): void {
        Masonry.organizeItems(this, items, fromRow, toRow);
    }

    protected initItems(): void {
        this.addColumns();
        super.initItems();
    }

    protected onScroll(): void {
        this.addUntilFill();
    }

    protected onPageAdd(): void {
        this.addUntilFill();
    }

    protected getEstimatedColumnsPerRow(): number {
        return Math.ceil((this.width - this.options.gap) / (this.options.columnWidth + this.options.gap));
    }

    protected getEstimatedRowsPerPage(): number {

        let ratio = 1.75; // ~16/9 - landscape format to minimum the height and maximize the prediction of the number of items

        // Better prediction using ratio if provided
        if (this.options.ratioLimit && this.options.ratioLimit.max) {
            ratio = this.options.ratioLimit.max;
        }

        const columnWidth = this.getColumnWidth();
        const estimatedImageHeight = columnWidth / ratio;
        return Math.ceil(this.getGalleryVisibleHeight() / estimatedImageHeight);
    }

    /**
     * Use current gallery height as reference. To fill free space it add images until the gallery height changes, then are one more row
     */
    protected addUntilFill(): void {
        do {
            this.addItemsToDom(1);
        } while (this.viewPortIsNotFilled() && this.visibleCollection.length < this.collection.length);
    }

    protected addItemToDOM(item: Item<Model>): void {
        const shortestColumn = this.getShortestColumn();
        shortestColumn.addItem(item);
        super.addItemToDOM(item, shortestColumn.elementRef);
        this.addItemToPhotoswipeCollection(item)
    }

    protected endResize(): void {

        super.endResize();

        if (!this.visibleCollection.length) {
            return;
        }

        // Compute with new width. Rows indexes may have change
        this.visibleCollection.length = 0;
        this.addColumns();
        this.addUntilFill();
    }

    protected addColumns(): void {
        if (!this.bodyElementRef) {
            throw new Error('Gallery not initialized');
        }

        this.bodyElementRef.innerHTML = '';
        this.columns = [];
        const columnWidth = this.getColumnWidth();
        for (let i = 0; i < this.getEstimatedColumnsPerRow(); i++) {
            const columnRef = new Column<Model>(this.document, { width: columnWidth, gap: this.options.gap });
            this.columns.push(columnRef);
            this.bodyElementRef.appendChild(columnRef.elementRef);
        }
    }

    protected empty(): void {
        super.empty();
        this.addColumns();

        this.photoswipeItems = []
    }

    /**
     * Returns true if at least one columns doesn't overflow on the bottom of the viewport
     */
    private viewPortIsNotFilled(): boolean {
        return this.columns.some(c => c.elementRef.getBoundingClientRect().bottom < this.document.documentElement.clientHeight);
    }

    private addItemsToDom(nbItems: number) {

        const nbVisibleImages = this.visibleCollection.length;

        // Next row to add (first invisible row)
        const firstIndex = this.visibleCollection.length ? nbVisibleImages : 0;
        const lastWantedIndex = firstIndex + nbItems - 1;

        // Compute size only for elements we're going to add
        this.organizeItems(this.collection.slice(nbVisibleImages), firstIndex, lastWantedIndex);

        for (let i = nbVisibleImages; i < this.collection.length; i++) {
            const item = this.collection[i];
            if (i <= lastWantedIndex) {
                this.addItemToDOM(item);
            } else {
                break;
            }
        }

        this.flushBufferedItems();
        this.updateNextButtonVisibility();
    }

    /**
     * Return square side size
     */
    private getColumnWidth(): number {
        const itemsPerRow = this.getEstimatedColumnsPerRow();
        return Math.floor((this.width - (itemsPerRow - 1) * this.options.gap) / itemsPerRow);
    }

    private getShortestColumn(): Column<Model> {
        return this.columns.reduce((shortestColumn, column) => {
            if (!shortestColumn) {
                return column;
            }

            return column.height < shortestColumn.height ? column : shortestColumn;
        });
    }

}
