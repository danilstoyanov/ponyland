/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import type LazyLoadQueueIntersector from '../lazyLoadQueueIntersector';
import IS_TOUCH_SUPPORTED from '../../environment/touchSupport';
import rootScope from '../../lib/rootScope';
import animationIntersector, {AnimationItemGroup} from '../animationIntersector';
import {horizontalMenu} from '../horizontalMenu';
import LazyLoadQueue from '../lazyLoadQueue';
import Scrollable, {ScrollableX} from '../scrollable';
import appSidebarRight from '../sidebarRight';
import StickyIntersector from '../stickyIntersector';
// import EmojiTab, {EmojiTabCategory, getEmojiFromElement} from '../tabs/emoji';
// import GifsTab from './tabs/gifs';
// import StickersTab from './tabs/stickers';
import StickersTab from './sticker-tab';
import {MOUNT_CLASS_TO} from '../../config/debug';
import AppGifsTab from '../sidebarRight/tabs/gifs';
import AppStickersTab from '../sidebarRight/tabs/stickers';
import findUpClassName from '../../helpers/dom/findUpClassName';
import findUpTag from '../../helpers/dom/findUpTag';
import whichChild from '../../helpers/dom/whichChild';
import cancelEvent from '../../helpers/dom/cancelEvent';
import {AppManagers} from '../../lib/appManagers/managers';
import {attachClickEvent, simulateClickEvent} from '../../helpers/dom/clickEvent';
import overlayCounter from '../../helpers/overlayCounter';
import noop from '../../helpers/noop';
import {FocusDirection, ScrollOptions} from '../../helpers/fastSmoothScroll';
import BezierEasing from '../../vendor/bezierEasing';
import ListenerSetter from '../../helpers/listenerSetter';
import ButtonIcon from '../buttonIcon';
import StickersTabCategory from '../emoticonsDropdown/category';
import {Middleware} from '../../helpers/middleware';

export const EMOTICONSSTICKERGROUP: AnimationItemGroup = 'emoticons-dropdown';

export interface EmoticonsTab {
  content: HTMLElement;
  scrollable: Scrollable;
  menuScroll?: ScrollableX;
  tabId: number;
  init: () => void;
  onOpen?: () => void;
  onOpened?: () => void;
  onClose?: () => void;
  onClosed?: () => void;
}

export interface EmoticonsTabConstructable<T extends EmoticonsTab = any> {
  new(...args: any[]): T;
}

const easing = BezierEasing(0.42, 0.0, 0.58, 1.0);

const scrollOptions: Partial<ScrollOptions> = {
  forceDuration: 150,
  transitionFunction: easing,
  maxDistance: 150
};

const renderEmojiDropdownElement = (): HTMLDivElement => {
  const div = document.createElement('div');
  div.innerHTML =
    `<div class="emoji-dropdown active">
      <div class="emoji-container">
        <div class="tabs-container"></div>
      </div>
      <div class="emoji-tabs menu-horizontal-div emoticons-menu no-stripe"></div>
    </div>`;
  const a: [string, string, number][] = [
    ['search justify-self-start', 'search', -1],
    ['emoji', 'smile', 0],
    ['stickers', 'stickers_face', 1],
    ['gifs', 'gifs', 2],
    ['delete justify-self-end', 'deleteleft', -1]
  ];

  const d = div.firstElementChild as HTMLDivElement;

  d.lastElementChild.append(...a.map(([className, icon, tabId]) => {
    const button = ButtonIcon(`${icon} menu-horizontal-div-item emoji-tabs-${className}`, {noRipple: true});
    button.dataset.tab = '' + tabId;
    return button;
  }));

  return d;
}

export const EMOJI_TEXT_COLOR = 'primary-text-color';

export class EmoticonsDropdown {
  public lazyLoadQueue = new LazyLoadQueue(1);
  private handleStickerClick: any;

  private container: HTMLElement;
  private tabsEl: HTMLElement;
  private tabId = -1;

  private tabs: {[id: number]: EmoticonsTab};

  private searchButton: HTMLElement;

  private selectTab: ReturnType<typeof horizontalMenu>;

  private tabsToRender: EmoticonsTab[] = [];
  private managers: AppManagers;


  private listenerSetter: ListenerSetter;

  public textColor: string;

  public element: HTMLElement;

  constructor() {
    this.listenerSetter = new ListenerSetter();
    this.element = renderEmojiDropdownElement();
  }

  public get tab() {
    return this.tabs[this.tabId];
  }

  public get intersectionOptions(): IntersectionObserverInit {
    return {root: this.getElement()};
  }

  public getTab<T extends EmoticonsTab>(instance: EmoticonsTabConstructable<T>) {
    return this.tabsToRender.find((tab) => tab instanceof instance) as T;
  }

  public init({handleStickerClick}: any) {
    this.managers = rootScope.managers;
    this.handleStickerClick = handleStickerClick;

    if(!this.tabsToRender.length) {
      this.tabsToRender = [
        new StickersTab(this.managers)
      ];
    }

    this.tabs = {};
    this.tabsToRender.forEach((tab, idx) => {
      (tab as any).emoticonsDropdown = this;
      tab.tabId = idx;
      this.tabs[idx] = tab;
    });

    this.container = this.element.querySelector('.emoji-container .tabs-container') as HTMLDivElement;
    this.container.prepend(...this.tabsToRender.map((tab) => (tab as any).container));
    this.tabsEl = this.element.querySelector('.emoji-tabs') as HTMLUListElement;

    horizontalMenu(this.tabsEl, this.container, this.onSelectTabClick, () => {
      const {tab} = this;
      tab.init?.();
      animationIntersector.checkAnimations(false, EMOTICONSSTICKERGROUP);
    });

    this.searchButton = this.element.querySelector('.emoji-tabs-search');

    this.listenerSetter.add(this.searchButton)('click', () => {
      if(this.tabId === this.getTab(StickersTab)?.tabId) {
        if(!appSidebarRight.isTabExists(AppStickersTab)) {
          appSidebarRight.createTab(AppStickersTab).open();
        }
      } else {
        if(!appSidebarRight.isTabExists(AppGifsTab)) {
          appSidebarRight.createTab(AppGifsTab).open();
        }
      }
    });

    const INIT_TAB_ID = this.getTab(StickersTab).tabId;

    simulateClickEvent(this.tabsEl.children[INIT_TAB_ID + 1] as HTMLElement);

    if(this.tabsToRender.length <= 1) {
      this.tabsEl.classList.add('hide');
    }

    this.tabs[INIT_TAB_ID].init?.(); // onTransitionEnd не вызовется, т.к. это первая открытая вкладка

    if(!IS_TOUCH_SUPPORTED) {
      let lastMouseMoveEvent: MouseEvent, mouseMoveEventAttached = false;
      const onMouseMove = (e: MouseEvent) => {
        lastMouseMoveEvent = e;
      };
      this.listenerSetter.add(overlayCounter)('change', (isActive) => {
        if(isActive) {
          if(!mouseMoveEventAttached) {
            this.listenerSetter.add(document.body)('mousemove', onMouseMove);
            mouseMoveEventAttached = true;
          }
        } else if(mouseMoveEventAttached) {
          this.listenerSetter.removeManual(document.body, 'mousemove', onMouseMove);
          if(lastMouseMoveEvent) {
            // this.onMouseOut(lastMouseMoveEvent);
          }
        }
      });
    }

    return this.element;
  }

  public getElement() {
    return this.element;
  }

  public scrollTo(tab: EmoticonsTab, element: HTMLElement) {
    tab.scrollable.scrollIntoViewNew({
      element: element as HTMLElement,
      axis: 'y',
      position: 'start',
      getElementPosition: tab.scrollable.container === element ? () => -element.scrollTop : undefined,
      ...scrollOptions
    });
  }

  private onSelectTabClick = (id: number) => {
    if(this.tabId === id) {
      const {tab} = this;
      this.scrollTo(tab, tab.scrollable.container as HTMLElement);
      return;
    }

    animationIntersector.checkAnimations(true, EMOTICONSSTICKERGROUP);

    this.tabId = id;
  };

  public static menuOnClick = (
    emoticons: any,
    menu: HTMLElement,
    scrollable: Scrollable,
    menuScroll?: ScrollableX,
    prevTab?: StickersTabCategory<any>,
    listenerSetter?: ListenerSetter
  ) => {
    let jumpedTo = -1;

    const scrollToTab = (tab: typeof prevTab, f?: boolean) => {
      const m = tab.menuScroll || menuScroll;
      if(m) {
        m.scrollIntoViewNew({
          element: tab.elements.menuTab,
          position: 'center',
          axis: 'x',
          getElementPosition: f ? ({elementPosition}) => {
            return elementPosition - 106;
          } : undefined,
          ...scrollOptions
        });
      }
    };

    const setActive = (tab: typeof prevTab, scroll = true) => {
      if(tab === prevTab) {
        return false;
      }

      let f = false;
      if(prevTab) {
        prevTab.elements.menuTab.classList.remove('active');
        if(prevTab.menuScroll && prevTab.menuScroll !== tab.menuScroll) {
          f = true;
          // scroll to first
          prevTab.menuScroll.container.parentElement.classList.remove('active');
          prevTab.menuScroll.scrollIntoViewNew({
            element: prevTab.menuScroll.firstElementChild as HTMLElement,
            forceDirection: scroll ? undefined : FocusDirection.Static,
            position: 'center',
            axis: 'x',
            ...scrollOptions
          });
        }
      }

      tab.elements.menuTab.classList.add('active');

      if(tab.menuScroll) {
        tab.menuScroll.container.parentElement.classList.add('active');
        scroll && menuScroll.scrollIntoViewNew({
          element: tab.menuScroll.container.parentElement,
          position: 'center',
          axis: 'x',
          ...scrollOptions
        });
      }

      if(prevTab) {
        scrollToTab(tab, f);
      }

      prevTab = tab;

      return true;
    };

    const setActiveStatic = (tab: typeof prevTab) => {
      if(prevTab?.local) {
        return;
      }

      emoticons.scrollable.scrollPosition = tab.elements.container.offsetTop + 1;
      const s = emoticons.menuScroll.container;
      const e = tab.elements.menuTab;
      s.scrollLeft = e.offsetLeft - s.clientWidth / 2 + e.offsetWidth / 2;
      setActive(tab, false);
    };

    let scrollingToContent = false;
    const stickyIntersector = new StickyIntersector(scrollable.container, (stuck, target) => {
      if(scrollingToContent) {
        return;
      }

      // console.log('sticky scrollTop', stuck, target, scrollable.container.scrollTop, jumpedTo);

      if(Math.abs(jumpedTo - scrollable.scrollPosition) <= 1) {
        return;
      } else {
        jumpedTo = -1;
      }

      const tab = emoticons.getCategoryByContainer(target);
      if(!tab.elements.menuTab) {
        return;
      }

      const which = whichChild(target);
      if(!stuck && (which || tab.menuScroll)) {
        return;
      }

      setActive(tab);
    });

    attachClickEvent(menu, (e) => {
      cancelEvent(e);
      let target = findUpClassName(e.target as HTMLElement, 'menu-horizontal-div-item');
      if(!target) {
        target = findUpClassName(e.target as HTMLElement, 'menu-horizontal-inner');
        if(!target || target.classList.contains('active')) {
          return;
        }

        target = target.firstElementChild.firstElementChild as HTMLElement;
      }

      const which = whichChild(target);

      const tab = emoticons.getCategoryByMenuTab(target);

      /* if(menuScroll) {
        menuScroll.scrollIntoView(target, false, 0);
      } */

      if(setActive(tab)) {
        // scrollToTab(tab);
        // return;
      }

      let offsetTop = 0, additionalOffset = 0;
      if(which > 0 || tab.menuScroll) {
        const element = tab.elements.container;
        additionalOffset = 1;
        offsetTop = element.offsetTop + additionalOffset; // * due to stickyIntersector
      }

      jumpedTo = offsetTop;

      scrollingToContent = true;
      scrollable.scrollIntoViewNew({
        element: offsetTop ? tab.elements.container : scrollable.firstElementChild as HTMLElement,
        position: 'start',
        axis: 'y',
        getElementPosition: offsetTop ? ({elementPosition}) => elementPosition + additionalOffset : undefined,
        startCallback: () => {
          // if(emoticons instanceof EmojiTab && !emoticons.isCategoryVisible(tab as EmojiTabCategory)) {
          //   emoticons._onCategoryVisibility(tab as EmojiTabCategory, true);
          // }
        },
        ...scrollOptions
      }).finally(() => {
        setActive(tab);
        scrollingToContent = false;
      });
    }, {listenerSetter});

    const a = scrollable.onAdditionalScroll ? scrollable.onAdditionalScroll.bind(scrollable) : noop;
    scrollable.onAdditionalScroll = () => {
      emoticons.content.parentElement.classList.toggle('no-border-top',
        scrollable.scrollPosition <= 0 ||
        emoticons.container.classList.contains('is-searching')
      );
      a();
    };

    emoticons.content.parentElement.classList.add('no-border-top');

    return {stickyIntersector, setActive, setActiveStatic};
  };

  public onMediaClick = async(e: {target: EventTarget | Element}, clearDraft = false, silent?: boolean, ignoreNoPremium?: boolean) => {
    const target = findUpTag(e.target as HTMLElement, 'DIV');
    if(!target) return false;

    const docId = target.dataset.docId;
    if(!docId) return false;

    const selectedDocument = await this.managers.appDocsManager.getDoc(docId);

    // console.log({document: docId, clearDraft, silent, target, ignoreNoPremium}, selectedDocument, target, 'event');

    this.handleStickerClick(target);
  };

  public addLazyLoadQueueRepeat(lazyLoadQueue: LazyLoadQueueIntersector, processInvisibleDiv: (div: HTMLElement) => void, middleware: Middleware) {
    const listenerSetter = new ListenerSetter();
    // listenerSetter.add(this)('close', () => {
    //   lazyLoadQueue.lock();
    // });

    // listenerSetter.add(this)('closed', () => {
    //   const divs = lazyLoadQueue.intersector.getVisible();

    //   for(const div of divs) {
    //     processInvisibleDiv(div);
    //   }

    //   lazyLoadQueue.intersector.clearVisible();
    // });

    // listenerSetter.add(this)('opened', () => {
    //   lazyLoadQueue.unlockAndRefresh();
    // });

    middleware.onClean(() => {
      listenerSetter.removeAll();
    });
  }

  public destroy() {
    this.listenerSetter.removeAll();
    this.tabsToRender.forEach((tab) => (tab as any).destroy?.());
    this.element.remove();
  }
}

const emoticonsDropdown = new EmoticonsDropdown();
MOUNT_CLASS_TO.emoticonsDropdown = emoticonsDropdown;
export default emoticonsDropdown;
