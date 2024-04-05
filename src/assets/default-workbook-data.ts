/**
 * Copyright 2023-present DreamNum Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
    BooleanNumber,
    LocaleType,
    SheetTypes
} from '@univerjs/core';

/**
 * Default workbook data
 * @type {IWorkbookData} document see https://univer.work/api/core/interfaces/IWorkbookData.html
 */
export const DEFAULT_WORKBOOK_DATA = {
    id: 'workbook-01',
    locale: LocaleType.EN_US,
    name: 'universheet',
    sheetOrder: ['sheet-01'],
    appVersion: '3.0.0-alpha',
    sheets: {
        'sheet-01': {
            type: SheetTypes.GRID,
            id: 'sheet-01',
            name: 'sheet1',
            cellData: {},
        },
    },
};
