import { Disposable, ICommandService, IMutationInfo, IRange } from '@univerjs/core'
import { COPY_TYPE, ISheetClipboardService } from '@univerjs/sheets-ui'
import { inject } from 'vue'

interface ServiceResponse {
  undos: IMutationInfo[];
  redos: IMutationInfo[];
}

export class PasteServiceController extends Disposable {
    constructor(
          @Inject(Injector) private _injector: Injector,
          @Inject(ISheetClipboardService) private _sheetClipboardService: ISheetClipboardService,
    ) {
      super()
      this._initClipboardHook()
    }
  
    // register hook
    private _initClipboardHook() {
      this.disposeWithMe(
        this._sheetClipboardService.addClipboardHook({
          hookName: 'numfmt',
          onPastePlainText(pasteTo, text, payload) {
            return {
              undos: [],
              redos: []
            }
    
          }
        })
      )
    }
  
    // collect number format info
    private _collectNumfmt(unitId: string, subUnitId: string, range: IRange) {
      // save number format info to private variable
    }
  
    // generate number format mutations
    private _generateNumfmtMutations(
      pastedRange: IRange,
      copyInfo: {
        copyType: COPY_TYPE
        copyRange?: IRange
        pasteType: string
      }
    ) {
      if (copyInfo.copyType === COPY_TYPE.CUT) {
        // remove number format info
      }
      if (copyInfo.pasteType === COPY_TYPE.COPY) {
        // add number format info
        return {
          redos: [
            { id: RemoveNumfmtMutation.id, params: removeRedos },
            { id: SetNumfmtMutation.id, params: setRedos },
          ],
          undos: [
            ...factorySetNumfmtUndoMutation(this._injector, setRedos),
            ...factoryRemoveNumfmtUndoMutation(this._injector, removeRedos),
          ],
        }
      }
    }
  }