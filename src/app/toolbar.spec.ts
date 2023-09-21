/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {HarnessLoader} from '@angular/cdk/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {Component, TemplateRef, ViewChild} from '@angular/core';
import {ComponentFixture, fakeAsync, flush, TestBed, waitForAsync} from '@angular/core/testing';
import {BrowserDynamicTestingModule, platformBrowserDynamicTesting} from '@angular/platform-browser-dynamic/testing';

import {defaultFeatures} from './data_types_internal';
import {DagNode} from './node_spec';
import {TEST_IMPORTS, TEST_PROVIDERS} from './test_providers';
import {A11yHelpCenterHarness} from './test_resources/a11y_help_center_harness';
import {DagToolbarHarness} from './test_resources/toolbar_harness';
import {DagToolbar, DagToolbarModule} from './toolbar';

const FAKE_DATA = [
  new DagNode('A', 'execution', 'SUCCEEDED'),
  new DagNode('B', 'artifact', 'SUCCEEDED'),
  new DagNode('C', 'execution', 'RUNNING'),
  new DagNode('D', 'artifact'),
  new DagNode('E', 'execution'),
];

TestBed.resetTestEnvironment();
TestBed.initTestEnvironment(
    BrowserDynamicTestingModule, platformBrowserDynamicTesting(),
    {teardown: {destroyAfterEach: true}});

describe('DagToolbar', () => {
  beforeEach(waitForAsync(async () => {
    await TestBed
        .configureTestingModule({
          declarations: [DagWrapper],
          imports: [
            ...TEST_IMPORTS,
            DagToolbarModule,
          ],
          providers: [...TEST_PROVIDERS],
        })
        .compileComponents();
  }));

  describe('Component', () => {
    let fixture: ComponentFixture<DagWrapper>;
    let toolbarHarness: DagToolbarHarness;
    let toolbar: DagToolbar;
    let loader: HarnessLoader;
    let rootLoader: HarnessLoader;

    beforeEach(waitForAsync(async () => {
      fixture = TestBed.createComponent(DagWrapper);
      fixture.detectChanges();

      toolbar = fixture.componentInstance.dagToolbar;
      loader = TestbedHarnessEnvironment.loader(fixture);
      rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
      toolbarHarness = await loader.getHarness(DagToolbarHarness);
    }));

    afterEach(fakeAsync(() => {
      fixture.destroy();
    }));

    it('Renders correctly', async () => {
      expect(toolbar).toBeDefined();
      expect(toolbarHarness).toBeDefined();
    });

    it('Calculated node states correctly', () => {
      expect(toolbar.graphState).toBe('Runtime');
      expect(toolbar.completedSteps).toBe(1);
    });

    it('Toggle reflects state correctly', async () => {
      spyOn(toolbar.expandedChange, 'emit');

      const toggler = await toolbarHarness.getExpandToggle();
      await toggler.toggle();
      expect(toolbar.expanded).toBe(false);
      expect(await toggler.isChecked()).toBe(false);
      expect(toolbar.expandedChange.emit).toHaveBeenCalled();
    });

    it('Zoom Value shows correctly and broadcasts changes', async () => {
      spyOn(toolbar.zoomChange, 'emit');

      const zoomIn = await toolbarHarness.getZoomInButton();
      const zoomOut = await toolbarHarness.getZoomOutButton();
      let zoomText = await toolbarHarness.getZoomText();
      expect(toolbar.zoom).toBe(1);
      expect(zoomText.trim()).toBe('100%');
      await zoomOut.click();

      zoomText = await toolbarHarness.getZoomText();
      expect(zoomText.trim()).toBe('90%');
      // expect(Math.round(toolbar.zoom) * 100).toBe(90); // This doesn't work
      await zoomIn.click();
      zoomText = await toolbarHarness.getZoomText();
      expect(zoomText.trim()).toBe('100%');
      expect(Math.round(toolbar.zoom) * 100).toBe(100);
      expect(toolbar.zoomChange.emit).toHaveBeenCalled();
    });

    it('Expand Artifacts toggle disabled when no artifacts are present',
       fakeAsync(async () => {
         expect(toolbar.disableToggle).toBe(false);
         toolbar.nodes = [
           new DagNode('a', 'execution', 'RUNNING'),
         ];
         flush();
         expect(toolbar.disableToggle).toBe(true);
       }));

    it('should render right aligned content', async () => {
      const element = await toolbarHarness.getElement('#rightButton');

      expect(await element.text()).toBe('Click me');
    });

    it('A11y Help Center dialog is opened by pressing button', async () => {
      const button = await toolbarHarness.getA11yHelpCenterButton();
      await button.click();
      const dialogHarness = await rootLoader.getHarness(A11yHelpCenterHarness);
      expect(dialogHarness).toBeDefined();
    });
  });
});

@Component({
  template: `
    <div class="container">
      <ai-dag-toolbar #dagToolbar
        [nodes]="nodes" [expanded]="true"
        [zoom]="1"
        [rightAlignedCustomToolbarToggleTemplates]="rightAlignedTemplates"
        [features]="features"
      ></ai-dag-toolbar>
    </div>
    <ng-template #rightAlignedTemplate>
      <button id="rightButton"> Click me</button>
    </ng-template>`,
  styles: [`
    .container {
      height: 400px;
      width: 400px;
    }`],
})
class DagWrapper {
  @ViewChild('dagToolbar', {static: false}) dagToolbar!: DagToolbar;
  nodes: DagNode[] = FAKE_DATA;
  @ViewChild('rightAlignedTemplate', {static: false})
  rightAlignedTemplate?: TemplateRef<{}>;

  rightAlignedTemplates: Array<TemplateRef<{}>> = [];

  ngAfterViewInit() {
    this.rightAlignedTemplates.push(this.rightAlignedTemplate!);
  }

  features = {...defaultFeatures, enableShortcuts: true};
}
