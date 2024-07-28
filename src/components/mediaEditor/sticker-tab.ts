/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import {EmoticonsDropdown} from '../emoticonsDropdown';
import {Document, MessagesAllStickers, StickerSet} from '../../layer';
import {MyDocument} from '../../lib/appManagers/appDocsManager';
import {AppManagers} from '../../lib/appManagers/managers';
import wrapEmojiText from '../../lib/richTextProcessor/wrapEmojiText';
import rootScope from '../../lib/rootScope';
import {putPreloader} from '../putPreloader';
import PopupStickers from '../popups/stickers';
import findAndSplice from '../../helpers/array/findAndSplice';
import findUpClassName from '../../helpers/dom/findUpClassName';
import mediaSizes from '../../helpers/mediaSizes';

import VisibilityIntersector, {OnVisibilityChangeItem} from '../visibilityIntersector';
import forEachReverse from '../../helpers/array/forEachReverse';
import PopupElement from '../popups';
import apiManagerProxy from '../../lib/mtproto/mtprotoworker';
import getStickerEffectThumb from '../../lib/appManagers/utils/stickers/getStickerEffectThumb';
import StickersTabCategory, {EmoticonsTabStyles} from '../emoticonsDropdown/category';
import {i18n} from '../../lib/langPack';
import {onCleanup} from 'solid-js';
import SuperStickerRenderer from '../emoticonsDropdown/tabs/SuperStickerRenderer';
import StickerTabBase from './sticker-tab-base';

type StickersTabItem = {element: HTMLElement, document: Document.document};
export default class StickersTab extends StickerTabBase<StickersTabCategory<StickersTabItem>, Document.document[]> {
  private stickerRenderer: SuperStickerRenderer;

  constructor(managers: AppManagers) {
    super({
      managers,
      searchFetcher: async(value) => {
        if(!value) return [];
        return this.managers.appStickersManager.searchStickers(value);
      },
      groupFetcher: async(group) => {
        if(!group) return [];

        if(group._ === 'emojiGroupPremium') {
          return this.managers.appStickersManager.getPremiumStickers();
        }

        return this.managers.appStickersManager.getStickersByEmoticon({emoticon: group.emoticons, includeServerStickers: true});
      },
      processSearchResult: async({data: stickers, searching, grouping}) => {
        if(!stickers || (!searching && !grouping)) {
          return;
        }

        if(!stickers.length) {
          const span = i18n('NoStickersFound');
          span.classList.add('emoticons-not-found');
          return span;
        }

        const container = this.categoriesContainer.cloneNode(false) as HTMLElement;
        const category = this.createCategory({styles: EmoticonsTabStyles.Stickers});
        const promise = StickersTab.categoryAppendStickers(
          this,
          this.stickerRenderer,
          stickers.length,
          category,
          stickers
        );

        container.append(category.elements.container);

        let cleaned = false;
        onCleanup(() => {
          cleaned = true;
          category.middlewareHelper.destroy();
          this.clearCategoryItems(category, true);
        });

        await promise;

        if(!cleaned) {
          StickersTab._onCategoryVisibility(category, true);
        }

        return container;
      },
      // searchNoLoader: true,
      searchPlaceholder: 'SearchStickers',
      searchType: 'stickers'
    });

    this.container.classList.add('stickers-padding');
    this.content.id = 'content-stickers';
  }

  private setFavedLimit(limit: number) {
    const category = this.categories['faved'];
    category.limit = limit;
  }

  public static _onCategoryVisibility = (category: StickersTabCategory<any>, visible: boolean) => {
    category.elements.items.replaceChildren(...(!visible ? [] : category.items.map(({element}) => element)));
  };

  private onCategoryVisibility = ({target, visible}: OnVisibilityChangeItem) => {
    const category = this.categoriesMap.get(target);
    StickersTab._onCategoryVisibility(category, visible);
  };

  public init() {
    super.init();

    const intersectionOptions = this.emoticonsDropdown.intersectionOptions;
    this.categoriesIntersector = new VisibilityIntersector(this.onCategoryVisibility, intersectionOptions);

    this.scrollable.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if(findUpClassName(target, 'category-title')) {
        const container = findUpClassName(target, 'emoji-category');
        const category = this.categoriesMap.get(container);
        if(category.local) {
          return;
        }

        PopupElement.createPopup(PopupStickers, {id: category.set.id, access_hash: category.set.access_hash}, false, this.emoticonsDropdown.chatInput).show();
        return;
      }

      this.emoticonsDropdown.onMediaClick(e);
    });

    this.menuOnClickResult = EmoticonsDropdown.menuOnClick(this as any, this.menu, this.scrollable, this.menuScroll);

    const preloader = putPreloader(this.content, true);

    const onCategoryStickers = (category: StickersTabCategory<StickersTabItem>, stickers: MyDocument[]) => {
      // if(category.id === 'faved' && category.limit && category.limit < stickers.length) {
      //   category.limit = stickers.length;
      // }

      if(category.limit) {
        stickers = stickers.slice(0, category.limit);
      }

      const ids = new Set(stickers.map((doc) => doc.id));
      forEachReverse(category.items, (item) => {
        if(!ids.has(item.document.id)) {
          this.deleteSticker(category, item.document, true);
        }
      });

      this.toggleLocalCategory(category, !!stickers.length);
      forEachReverse(stickers, (doc, idx) => {
        this.unshiftSticker(category, doc, true, idx);
      });
      this.spliceExceed(category);
      category.elements.container.classList.remove('hide');
    };

    const favedCategory = this.createLocalCategory({
      id: 'faved',
      title: 'FavoriteStickers',
      icon: 'savedmessages',
      styles: EmoticonsTabStyles.Stickers
    });

    const recentCategory = this.createLocalCategory({
      id: 'recent',
      title: 'Stickers.Recent',
      icon: 'recent',
      styles: EmoticonsTabStyles.Stickers
    });
    recentCategory.limit = 3;

    const promises = [
      Promise.all([
        this.managers.apiManager.getLimit('favedStickers'),
        this.managers.appStickersManager.getFavedStickersStickers()
      ]).then(([limit, stickers]) => {
        this.setFavedLimit(limit);
        onCategoryStickers(favedCategory, stickers);
      }),

      this.managers.appStickersManager.getRecentStickersStickers().then((stickers) => {
        onCategoryStickers(recentCategory, stickers);
      }),

      this.managers.appStickersManager.getAllStickers().then((res) => {
        for(const set of (res as MessagesAllStickers.messagesAllStickers).sets) {
          StickersTab.renderStickerSet(this, this.stickerRenderer, set, false);
        }
      })
    ];

    Promise.race(promises).finally(() => {
      preloader.remove();
    });

    Promise.all(promises).finally(() => {
      this.mounted = true;

      const favedCategory = this.categories['faved'];
      const recentCategory = this.categories['recent'];
      this.menuOnClickResult.setActive(favedCategory.items.length ? favedCategory : recentCategory);

      rootScope.addEventListener('stickers_installed', (set) => {
        if(!this.categories[set.id]) {
          StickersTab.renderStickerSet(this, this.stickerRenderer, set, true);
        }
      });
    });

    this.stickerRenderer = this.createStickerRenderer();

    mediaSizes.addEventListener('resize', this.resizeCategories);

    this.init = null;
  }

  public deleteCategory(category: StickersTabCategory<StickersTabItem>) {
    const ret = super.deleteCategory(category);
    if(ret) {
      this.clearCategoryItems(category);
    }

    return ret;
  }

  private clearCategoryItems(category: StickersTabCategory<StickersTabItem>, noUnmount?: boolean) {
    if(!noUnmount) category.elements.items.replaceChildren();
    category.items.splice(0, Infinity).forEach(({element}) => this.stickerRenderer.unobserveAnimated(element));
  }

  public deleteSticker(category: StickersTabCategory<StickersTabItem>, doc: MyDocument, batch?: boolean) {
    const item = findAndSplice(category.items, (item) => item.document.id === doc.id);
    if(item) {
      item.element.remove();
      this.stickerRenderer.unobserveAnimated(item.element);

      if(!batch) {
        this.onLocalCategoryUpdate(category);
      }
    }
  }

  public unshiftSticker(category: StickersTabCategory<StickersTabItem>, doc: MyDocument, batch?: boolean, idx?: number) {
    if(idx !== undefined) {
      const i = category.items[idx];
      if(i && i.document.id === doc.id) {
        return;
      }
    }

    let item = findAndSplice(category.items, (item) => item.document.id === doc.id);
    if(!item) {
      item = {
        element: this.stickerRenderer.renderSticker(doc, undefined, undefined, category.middlewareHelper.get()),
        document: doc
      };
    }

    category.items.unshift(item);
    category.elements.items.prepend(item.element);

    if(!batch) {
      this.spliceExceed(category);
    }
  }

  public unshiftRecentSticker(doc: MyDocument) {
    this.managers.appStickersManager.saveRecentSticker(doc.id);
  }

  public deleteRecentSticker(doc: MyDocument) {
    this.managers.appStickersManager.saveRecentSticker(doc.id, true);
  }

  public onOpened() {
    this.resizeCategories();
  }

  public destroy() {
    this.stickerRenderer.destroy();
    super.destroy();
  }

  public static categoryAppendStickers(
    tab: StickerTabBase<any>,
    stickerRenderer: SuperStickerRenderer,
    count: number,
    category: StickersTabCategory<StickersTabItem>,
    promise: MaybePromise<MyDocument[]>
  ) {
    const {container} = category.elements;

    category.setCategoryItemsHeight(count);
    container.classList.remove('hide');

    return Promise.all([
      promise,
      apiManagerProxy.isPremiumFeaturesHidden()
    ]).then(([documents, isPremiumFeaturesHidden]) => {
      const isVisible = tab.isCategoryVisible(category);

      const elements = documents.map((document) => {
        if(isPremiumFeaturesHidden && getStickerEffectThumb(document)) {
          return;
        }

        const element = stickerRenderer.renderSticker(document, undefined, undefined, category.middlewareHelper.get());
        category.items.push({document, element});
        return element;
      }).filter(Boolean);

      if(isVisible) {
        category.elements.items.append(...elements);
      }
    });
  }

  public static async renderStickerSet(
    tab: StickerTabBase<any>,
    stickerRenderer: SuperStickerRenderer,
    set: StickerSet.stickerSet,
    prepend?: boolean
  ) {
    const category = tab.createCategory({
      stickerSet: set,
      title: wrapEmojiText(set.title),
      styles: EmoticonsTabStyles.Stickers
    });
    const {menuTabPadding} = category.elements;

    const promise = tab.managers.appStickersManager.getStickerSet(set);
    this.categoryAppendStickers(
      tab,
      stickerRenderer,
      set.count,
      category,
      promise.then((stickerSet) => stickerSet.documents as MyDocument[])
    );

    if(prepend !== undefined) {
      tab.positionCategory(category, prepend);
    }

    tab.renderStickerSetThumb({
      set,
      menuTabPadding,
      middleware: category.middlewareHelper.get()
    });
  }
}
