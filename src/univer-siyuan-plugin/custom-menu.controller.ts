import { OnLifecycle } from "@univerjs/core";

@OnLifecycle(LifecycleStages.Steady, CustomMenuController)
export class CustomMenuController extends Disposable {
  constructor(
    @Inject(Injector) private readonly _injector: Injector,
    @ICommandService private readonly _commandService: ICommandService,
    @IMenuService private readonly _menuService: IMenuService,
    @Inject(ComponentManager) private readonly _componentManager: ComponentManager,
  ) {
    super();

    this._initCommands();
    this._registerComponents();
    this._initMenus();
  }

  /**
   * register commands
  */
  private _initCommands(): void { }

  /**
   * register icon components
  */
  private _registerComponents(): void { }

  /**
   * register menu items
  */
  private _initMenus(): void { }
}