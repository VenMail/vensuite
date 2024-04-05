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
} from '@univerjs/core';
import { ptToPixel } from '@univerjs/engine-render';

/**
 * Default document data
 * @type {IDocumentData} document see https://univer.work/api/core/interfaces/IDocumentData.html
 */
export const DEFAULT_DOCUMENT_DATA = {
    id: 'document-01',
    locale: LocaleType.EN_US,
    container: "document",
    title: 'New Document',
    documentStyle: {
        marginTop: ptToPixel(50),
        marginBottom: ptToPixel(50),
        marginRight: ptToPixel(40),
        marginLeft: ptToPixel(40),
    },
};
