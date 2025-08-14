<template>
  <div
    ref="scaffoldContainer"
    v-loading="loading"
    class="scaffold-container"
    element-loading-text="Loading..."
    element-loading-background="rgba(0, 0, 0, 0.3)"
  >
    <map-svg-sprite-color />
    <scaffold-tooltip
      :createData="createData"
      :label="tData.label"
      :region="tData.region"
      :visible="tData.visible"
      :x="tData.x"
      :y="tData.y"
      :annotationDisplay="annotationDisplay"
      :annotationFeature="annotationFeature"
      :offlineAnnotationEnabled="offlineAnnotationEnabled"
      @confirm-create="confirmCreate($event)"
      @cancel-create="cancelCreate()"
      @confirm-comment="confirmComment($event)"
      @confirm-delete="confirmDelete()"
      @tooltip-hide="onTooltipHide()"
    />
    <div
      id="organsDisplayArea"
      ref="display"
      tabindex="-1"
      style="height: 100%; width: 100%"
      @keydown.66="backgroundChangeCallback"
    />
    <div v-show="displayUI && !isTransitioning">
      <DrawToolbar
        v-if="viewingMode === 'Annotation' && (authorisedUser || offlineAnnotationEnabled)"
        :toolbarOptions="toolbarOptions"
        :activeDrawTool="activeDrawTool"
        :activeDrawMode="activeDrawMode"
        :hoverVisibilities=hoverVisibilities
        @clickToolbar="toggleDrawing"
        @showTooltip="showHelpText"
        @hideTooltip="hideHelpText"
        ref="toolbarPopover"
      />
      <el-popover
        v-if="displayWarning"
        ref="warningPopover"
        :visible="hoverVisibilities[7].value"
        :content="warningMessage"
        placement="right"
        width="max-content"
        :teleported="false"
        popper-class="scaffold-popper message-popper right-popper non-selectable"
      >
        <template #reference>
          <div
            v-if="displayWarning"
            class="message-icon warning-icon"
            @mouseover="showHelpText(7)"
            @mouseout="hideHelpText(7)"
          >
            <el-icon><el-icon-warning-filled /></el-icon>
            <span class="message-text">Beta</span>
          </div>
        </template>
      </el-popover>
      <el-popover
        v-if="displayLatestChanges"
        :visible="hoverVisibilities[8].value"
        :content="latestChangesMessage"
        placement="right"
        :teleported="false"
        trigger="manual"
        popper-class="scaffold-popper message-popper right-popper non-selectable"
        ref="whatsNewPopover"
      >
        <template #reference>
          <div
            v-if="displayLatestChanges && latestChangesMessage"
            class="el-icon-warning message-icon latest-changesicon"
            @mouseover="showHelpText(8)"
            @mouseout="hideHelpText(8)"
          >
            <el-icon><el-icon-warning-filled /></el-icon>
            <span class="message-text">What's new?</span>
          </div>
        </template>
      </el-popover>
      <el-popover
        :visible="hoverVisibilities[6].value"
        content="Change region visibility"
        placement="right"
        width="max-content"
        :teleported="false"
        trigger="manual"
        popper-class="scaffold-popper right-popper non-selectable"
        ref="regionVisibilityPopover"
      >
        <template #reference>
          <ScaffoldTreeControls
            ref="scaffoldTreeControls"
            :isReady="isReady"
            :show-colour-picker="enableColourPicker"
            @object-selected="objectSelected"
            @object-hovered="objectHovered"
            @drawer-toggled="drawerToggled"
          />
        </template>
      </el-popover>
      <div class="primitive-controls-box">
        <primitive-controls
          ref="primitiveControls"
          :createData="createData"
          :viewingMode="viewingMode"
          @primitivesUpdated="primitivesUpdated"
        />
      </div>
      <el-popover
        v-if="timeVarying"
        ref="sliderPopover"
        width="max-content"
        :visible="hoverVisibilities[5].value"
        content="Move the slider to animate the region"
        placement="top"
        :teleported="false"
        trigger="manual"
        popper-class="scaffold-popper top-popper non-selectable"
      >
        <template #reference>
          <div
            v-if="timeVarying"
            class="time-slider-container"
            :class="[minimisedSlider ? 'minimised' : '', sliderPosition]"
          >
            <el-tabs type="card">
              <el-tab-pane label="Animate scaffold">
                <el-row class="tab-content">
                  <map-svg-icon
                    v-if="isPlaying"
                    icon="pause"
                    class="icon-button video-button"
                    @click="play(false)"
                  />
                  <map-svg-icon
                    v-else
                    icon="play"
                    class="video-button icon-button"
                    @click="play(true)"
                  />
                  <el-slider
                    :min="0"
                    :max="timeMax"
                    :model-value="currentTime / 100 * timeMax"
                    :step="0.1"
                    tooltip-class="time-slider-tooltip"
                    class="slider"
                    :format-tooltip="formatTooltip"
                    :marks="timeStamps"
                    @input="timeChange($event)"
                  />
                </el-row>
              </el-tab-pane>
              <el-tab-pane label="Animation data">
                <el-row class="tab-content">
                  <div class="animation-data">
                    Original duration:
                    <div class="purple">
                      {{ orginalDuration }}
                    </div>
                  </div>
                  <div class="animation-data">
                    Animation duration:
                    <div class="purple">
                      {{ animateDuration }}
                    </div>
                  </div>
                  <div class="animation-data">
                    Playback speed
                    <el-select
                      :teleported="true"
                      :model-value="currentSpeed"
                      placeholder="Select"
                      class="scaffold-select-box speed"
                      popper-class="scaffold_viewer_dropdown"
                      @change="speedChanged($event)"
                    >
                      <el-option
                        v-for="item in playSpeed"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </div>
                </el-row>
              </el-tab-pane>
            </el-tabs>
          </div>
        </template>
      </el-popover>
      <div class="bottom-right-control">
        <el-popover
          :visible="hoverVisibilities[0].value"
          content="Zoom in"
          width="max-content"
          placement="left"
          :teleported="false"
          trigger="manual"
          popper-class="scaffold-popper left-popper non-selectable"
          ref="zoomInPopover"
        >
          <template #reference>
            <map-svg-icon
              icon="zoomIn"
              class="icon-button zoomIn"
              @click="zoomIn()"
              @mouseover="showHelpText(0)"
              @mouseout="hideHelpText(0)"
            />
          </template>
        </el-popover>
        <el-popover
          :visible="hoverVisibilities[1].value"
          content="Zoom out"
          placement="top-end"
          width="max-content"
          :teleported="false"
          trigger="manual"
          popper-class="scaffold-popper popper-zoomout non-selectable"
          ref="zoomOutPopover"
        >
          <template #reference>
            <map-svg-icon
              icon="zoomOut"
              class="icon-button zoomOut"
              @click="zoomOut()"
              @mouseover="showHelpText(1)"
              @mouseout="hideHelpText(1)"
            />
          </template>
        </el-popover>
        <el-popover
          :visible="hoverVisibilities[2].value"
          placement="top"
          :teleported="false"
          trigger="manual"
          width="max-content"
          popper-class="scaffold-popper non-selectable"
          ref="zoomFitPopover"
        >
          <div>
            Fit to
            <br />
            window
          </div>
          <template #reference>
            <map-svg-icon
              icon="fitWindow"
              class="icon-button fitWindow"
              @click="fitWindow()"
              @mouseover="showHelpText(2)"
              @mouseout="hideHelpText(2)"
            />
          </template>
        </el-popover>
      </div>
      <el-popover
        v-if="openMapRef"
        ref="open-map-popover"
        :virtual-ref="openMapRef"
        placement="top-start"
        width="128"
        :teleported="false"
        trigger="click"
        popper-class="open-map-popper"
        virtual-triggering
      >
        <el-row v-for="item in openMapOptions" :key="item.key">
          <el-button
            type="primary"
            plain
            @click="$emit('open-map', item.key)"
          >
            {{ item.display }}
          </el-button>
        </el-row>
      </el-popover>
      <el-popover
        ref="backgroundPopover"
        :virtual-ref="backgroundIconRef"
        placement="top-start"
        width="320"
        :teleported="false"
        trigger="click"
        popper-class="background-popper non-selectable h-auto"
        virtual-triggering
      >
        <div>
          <el-row class="backgroundText">Viewing Mode</el-row>
          <el-row class="backgroundControl">
            <div style="margin-bottom: 2px;">
              <template
                  v-for="(value, key, index) in viewingModes"
                  :key="key"
                >
                  <template v-if="key === viewingMode">
                    <span class="viewing-mode-title"><b >{{ key }}</b></span>
                  </template>
                  <template v-else>
                    <span class="viewing-mode-unselected" @click="changeViewingMode(key)">{{ key }}</span>
                  </template>
              </template>
            </div>
            <el-row class="viewing-mode-description">
              {{ modeDescription }}
            </el-row>
            <el-row v-if="viewingMode === 'Annotation' && offlineAnnotationEnabled" class="viewing-mode-description">
              (Anonymous annotate)
            </el-row>
          </el-row>
          <el-row class="backgroundSpacer"></el-row>
          <el-row class="backgroundText">Organs display</el-row>
          <el-row class="backgroundControl">
            <el-radio-group
              v-model="colourRadio"
              class="scaffold-radio"
              @change="setColour(colourRadio, true)"
            >
              <el-radio :value="true">Colour</el-radio>
              <el-radio :value="false">Greyscale</el-radio>
            </el-radio-group>
          </el-row>
          <el-row class="backgroundSpacer"></el-row>
          <el-row class="backgroundText">Outlines display</el-row>
          <el-row class="backgroundControl">
            <el-radio-group
              v-model="outlinesRadio"
              class="scaffold-radio"
              @change="setOutlines(outlinesRadio, true)"
            >
              <el-radio :value="true">Show</el-radio>
              <el-radio :value="false">Hide</el-radio>
            </el-radio-group>
          </el-row>
          <el-row class="backgroundSpacer"></el-row>
          <el-row class="backgroundText"> Change background </el-row>
          <el-row class="backgroundChooser">
            <div
              v-for="item in availableBackground"
              :key="item"
              :class="[
                'backgroundChoice',
                item,
                item == currentBackground ? 'active' : '',
              ]"
              @click="backgroundChangeCallback(item)"
            />
          </el-row>
        </div>
      </el-popover>
      <div
        class="settings-group"
        :class="{ open: drawerOpen, close: !drawerOpen }"
      >
        <el-row v-if="showOpenMapButton">
          <el-popover
            :visible="hoverVisibilities[3].value"
            content="Open new map"
            placement="right"
            :teleported="false"
            trigger="manual"
            width="max-content"
            popper-class="scaffold-popper right-popper non-selectable"
            ref="openMapPopover"
          >
            <template #reference>
              <map-svg-icon
                v-if="enableOpenMapUI && openMapOptions.length > 0"
                ref="openMapRef"
                icon="openMap"
                class="icon-button open-map-button"
                @mouseover="showHelpText(3)"
                @mouseout="hideHelpText(3)"
              />
            </template>
          </el-popover>
        </el-row>
        <el-row v-if="showLocalSettings">
          <el-popover
            :visible="hoverVisibilities[4].value"
            content="Change background color"
            placement="right"
            width="max-content"
            :teleported="false"
            trigger="manual"
            popper-class="scaffold-popper right-popper non-selectable"
            ref="settingsPopover"
          >
            <template #reference>
              <map-svg-icon
                ref="backgroundIconRef"
                icon="changeBckgd"
                class="icon-button"
                @mouseover="showHelpText(4)"
                @mouseout="hideHelpText(4)"
              />
            </template>
          </el-popover>
        </el-row>
      </div>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-alert, no-console */
import { inject, markRaw, provide, shallowRef } from 'vue';
import {
  WarningFilled as ElIconWarningFilled,
  ArrowDown as ElIconArrowDown,
  ArrowLeft as ElIconArrowLeft,
} from '@element-plus/icons-vue'
import PrimitiveControls from "./PrimitiveControls.vue";
import ScaffoldTooltip from "./ScaffoldTooltip.vue";
import ScaffoldTreeControls from "./ScaffoldTreeControls.vue";
import { MapSvgIcon, MapSvgSpriteColor } from "@abi-software/svg-sprite";
import { DrawToolbar } from '@abi-software/map-utilities'
import '@abi-software/map-utilities/dist/style.css'
import {
  createNewAnnotationsWithFeatures,
  addUserAnnotationWithFeature,
  annotationFeaturesToPrimitives,
  getClickedObjects,
  getDeletableObjects,
  getDrawnAnnotations,
  getEditableLines,
  getObjectsFromAnnotations,
  findObjectsWithNames,
  updateBoundingBox,
} from "../scripts/Utilities.js";
import {
  ElButton as Button,
  ElCol as Col,
  ElLoading as Loading,
  ElRadio as Radio,
  ElRadioGroup as RadioGroup,
  ElOption as Option,
  ElPopover as Popover,
  ElRow as Row,
  ElSelect as Select,
  ElSlider as Slider,
  ElTabPane as TabPane,
  ElTabs as Tabs,
} from "element-plus";
import { AnnotationService } from '@abi-software/sparc-annotation';
import { EventNotifier } from "../scripts/EventNotifier.js";
import { OrgansViewer } from "../scripts/OrgansRenderer.js";
import { SearchIndex } from "../scripts/Search.js";
import { mapState } from 'pinia';
import { useMainStore } from "@/store/index";
import { getNerveMaps } from "../scripts/MappedNerves.js";
const nervesMap = getNerveMaps();
let totalNerves = 0, foundNerves = 0;

// This will be the config for selected nerves
const NERVE_CONFIG = {
  COLOUR: '#FE0000',
  RADIUS: 8,
  RADIAL_SEGMENTS: 32,
}

const haveSameElements = (arr1, arr2) => {
  if (arr1.length !== arr2.length) return false;
  return arr1.sort().every((value, index) => {
    return value === arr2.sort()[index]
  });
}

/**
 * A vue component of the scaffold viewer.
 *
 * @requires ./PrimitveControls.vue
 * @requires ./TreeControls.vue
 */
export default {
  name: "ScaffoldVuer",
  components: {
    Button,
    Col,
    Loading,
    Option,
    Popover,
    Radio,
    RadioGroup,
    Row,
    Select,
    Slider,
    TabPane,
    Tabs,
    MapSvgIcon,
    MapSvgSpriteColor,
    PrimitiveControls,
    ScaffoldTooltip,
    ElIconWarningFilled,
    ElIconArrowDown,
    ElIconArrowLeft,
    DrawToolbar,
    ScaffoldTreeControls
  },
  setup(props) {
    let annotator = inject('$annotator')
    if (!annotator) {
      annotator = markRaw(new AnnotationService(`${props.flatmapAPI}annotator`));
      provide('$annotator', annotator)
    }
    return { annotator }
  },
  props: {
    /**
      * The option to show annotation information in sidebar
      */
    annotationSidebar: {
      type: Boolean,
      default: false,
    },
    /**
     * URL of the zincjs metadata. This value will be ignored if a valid
     * state prop is also provided.
     * If the url needs to be updated with state present, please use
     * the setURL method.
     */
    url: {
      type: String,
      default: "",
    },
    /**
     * Show the colour control of set to true.
     */
    showColourPicker: {
      type: Boolean,
      default: false,
    },
    /**
     * Flag to show/hide the UI.
     */
    displayUI: {
      type: Boolean,
      default: true,
    },
    /**
     * Display all graphics at start.
     *
     * This setting only works when traditional is set to false.
     */
    displayAtStartUp: {
      type: Boolean,
      default: true,
    },
    /**
     * Use for toggling the help tooltips.
     */
    helpMode: {
      type: Boolean,
      default: false,
    },
    /**
     * The active item index of help mode.
     */
    helpModeActiveItem: {
      type: Number,
      default: 0,
    },
    /**
     * The option to use helpModeDialog.
     * On default, `false`, clicking help will show all tooltips.
     * If `true`, clicking help will show the help-mode-dialog.
     */
    helpModeDialog: {
      type: Boolean,
      default: false,
    },
    /**
     * The last item of help mode.
     */
    helpModeLastItem: {
      type: Boolean,
      default: false,
    },
    /**
     * The initial index number for help mode tooltips.
     * Set negative (e.g. -1) if there are other tooltips outside of `hoverVisibilities`.
     */
    helpModeInitialIndex: {
      type: Number,
      default: 0,
    },
    /**
     * Use for show/display beta warning icon.
     */
    displayWarning: {
      type: Boolean,
      default: true,
    },
    /**
     * Warning message for the hovered over text
     * on the warning icon.
     */
    warningMessage: {
      type: String,
      default: "Beta feature - under active development",
    },
    displayLatestChanges: {
      type: Boolean,
      default: false,
    },
    latestChangesMessage: {
      type: String,
      default: "New feature - Local search is now available",
    },
    /**
     * Show/hide pickable markers for regions.
     */
    displayMarkers: {
      type: Boolean,
      default: false,
    },
    /**
     * Display adjacent markers with a cluster marker.
     */
    markerCluster: {
      type: Boolean,
      default: false,
    },
    /**
     * GroupName to value pair.
     * The value can be a single number or and object in the following
     * form:
     *
     * {
     *  number: Number,
     *  imgURL: String
     * }
     *
     * When imgURL is specified, scaffoldvuer will attempt to render
     * the image in imgURL as marker instead.
     *
     */
    markerLabels : {
      type: Object,
      default: function () {
        return {}
      }
    },
    /**
     * Show/hide minimap.
     */
    displayMinimap: {
      type: Boolean,
      default: false,
    },
    /**
     * Format of the input URL
     */
    format: {
      type: String,
      default: "metadata",
    },
    /**
     * Settings for minimap position, size and alignment.
     */
    minimapSettings: {
      type: Object,
      default: function () {
        return {
          x_offset: 16,
          y_offset: 16,
          width: 128,
          height: 128,
          align: "top-right",
        };
      },
    },
    /**
     * Flag to determine rather the open map UI icon and popup
     * should be shown or not.
     */
    enableOpenMapUI: {
      type: Boolean,
      default: false,
    },
    /**
     * Define what is considered as nerves.
     */
    isNerves: {
      type: Object,
      default: {
        regions: ["nerves"]
      },
    },
    /**
     * This array populate the the openMapOptions popup.
     * Each entry contains a pair of display and key.
     */
    openMapOptions: {
      type: Array,
      default: function () {
        return [
          {
            display: "Open AC Map",
            key: "AC"
          },
          {
            display: "Open FC Map",
            key: "FC"
          },
          {
            display: "Open 3D Human Map",
            key: "3D"
          },
        ]
      },
    },
    /**
     * State containing state of the scaffold.
     */
    state: {
      type: Object,
      default: undefined,
    },
    /**
     * Optional prop for the name of the region to focus on,
     * this option is ignored if state or viewURL is also provided.
     */
    region: {
      type: String,
      default: "",
    },
    /**
     * Optional prop for an URL of containing information of a viewport.
     * This option is ignored if state is also provided.
     * It will use the provided URL as base if a relative parth is provided.
     */
    viewURL: {
      type: String,
      default: "",
    },
    /**
     * Settings for turning on/off rendering
     */
    render: {
      type: Boolean,
      default: true,
    },
    /**
     * Specify the endpoint of the flatmap server.
     * This is used by annotation service included in
     * third party flatmapvuer library.
     */
    flatmapAPI: {
      type: String,
      default: "https://mapcore-demo.org/current/flatmap/v3/"
    },
    /**
     * The option to show local settings UI
     * (background colour, viewing mode, etc.)
     */
    showLocalSettings: {
      type: Boolean,
      default: true,
    },
    /**
     * The option to show open new map button
     */
    showOpenMapButton: {
      type: Boolean,
      default: true,
    },
  },
  provide() {
    return {
      flatmapAPI: this.flatmapAPI,
      scaffoldUrl: this.url,
      boundingDims: this.boundingDims,
    };
  },
  data: function () {
    return {
      annotator: undefined,
      colourRadio: true,
      createData: {
        drawingBox: false,
        toBeConfirmed: false,
        points: [],
        shape: "",
        x: 0,
        y: 0,
        editingIndex: -1,
        faceIndex: -1,
        toBeDeleted: false,
      },
      currentTime: 0.0,
      timeVarying: false,
      isPlaying: false,
      isReady: false,
      /**
       * This is set when scene is transitioning.
       */
      isTransitioning: false,
      tooltipAppendToBody: false,
      hoverVisibilities: [
        { value: false, ref: 'zoomInPopover' }, // 0
        { value: false, ref: 'zoomOutPopover' }, // 1
        { value: false, ref: 'zoomFitPopover' }, // 2
        { value: false, ref: 'openMapPopover' }, // 3
        { value: false, ref: 'settingsPopover' }, // 4
        { value: false, ref: 'sliderPopover' }, // 5
        { value: false, ref: 'regionVisibilityPopover' }, // 6
        { value: false, ref: 'warningPopover' }, // 7
        { value: false, ref: 'whatsNewPopover' }, // 8
        { value: false, refs: 'toolbarPopover', ref: 'editPopover' }, // 9
        { value: false, refs: 'toolbarPopover', ref: 'pointPopover' }, // 10
        { value: false, refs: 'toolbarPopover', ref: 'lineStringPopover' }, // 11
        { value: false, refs: 'toolbarPopover', ref: 'deletePopover' }, // 11
      ],
      inHelp: false,
      helpModeActiveIndex: this.helpModeInitialIndex,
      loading: false,
      duration: 3000,
      drawerOpen: true,
      currentBackground: "white",
      availableBackground: ["white", "lightskyblue", "black"],
      minimisedSlider: false,
      sliderPosition: "",
      timeMax: 100,
      orginalDuration: "",
      animateDuration: "6secs",
      playSpeed: [
        {
          value: 0.1,
          label: "0.1x",
        },
        {
          value: 0.5,
          label: "0.5x",
        },
        {
          value: 1,
          label: "1x",
        },
        {
          value: 2,
          label: "2x",
        },
        {
          value: 5,
          label: "5x",
        },
        {
          value: 10,
          label: "10x",
        },
      ],
      currentSpeed: 1,
      timeStamps: {},
      defaultCheckedKeys: [],
      outlinesRadio: true,
      tData: {
        label: "",
        region: "",
        visible: false,
        x: 200,
        y: 200,
        active: false,
      },
      fileFormat: "metadata",
      previousMarkerLabels: markRaw({}),
      viewingMode: "Exploration",
      viewingModes: {
        "Exploration": "View and explore detailed visualization of 3D scaffolds",
        "Neuron Connection": "Discover nerve connections by selecting a nerve and viewing its associated connections",
        "Annotation": ['View feature annotations', 'Add, comment on and view feature annotations'],
      },
      openMapRef: undefined,
      backgroundIconRef: undefined,
      annotationFeature: {},
      offlineAnnotationEnabled: false,
      offlineAnnotations: markRaw([]),
      authorisedUser: undefined,
      toolbarOptions: [
        "Delete",
        "Edit",
        "Point",
        "LineString",
      ],
      existDrawnFeatures: markRaw([]), // Store all exist drawn features
      activeDrawTool: undefined,
      activeDrawMode: undefined,
      boundingDims: {
        centre: [0, 0, 0],
        size:[1, 1, 1],
      },
      lastSelected: markRaw({
        region: "",
        group: "",
        isSearch: false,
      }),
      //checkedRegions: []
      previousNerves: [],
      sidebarSearch: false
    };
  },
  watch: {
    format: {
      handler: function (value) {
        this.fileFormat = value;
      },
      immediate: true,
    },
    url: {
      handler: function (newValue) {
        if (this.state === undefined || this.state.url === undefined)
          this.setURL(newValue);
      },
      immediate: true,
    },
    region: {
      handler: function (region) {
        if (!(this.state || this.viewURL)) this.setFocusedRegion(region);
      },
      immediate: true,
    },
    state: {
      handler: function (state) {
        this.setState(state);
      },
      immediate: true,
      deep: true,
    },
    viewURL: {
      handler: function (viewURL) {
        this.updateViewURL(viewURL);
      },
      immediate: true,
    },
    helpMode: function (newVal, oldVal) {
      if (newVal !== oldVal) {
        this.setHelpMode(newVal)
      }
    },
    helpModeActiveItem: function () {
      // just take the action from helpModeActiveItem
      // work with local value since the indexing is different
      if (this.helpMode) {
        this.helpModeActiveIndex += 1;
        this.setHelpMode(this.helpMode);
      }
    },
    displayMarkers: function (val) {
      this.$module.scene.displayMarkers = val;
      //Update pickable objects
      this.$module.scene.forcePickableObjectsUpdate = true;
    },
    displayMinimap: function (val) {
      this.$module.scene.displayMinimap = val;
    },
    currentTime: {
      handler: function () {
        /**
         * Emit when time in the current scene has changed
         * @arg {String} "Current time in scene"
         */
        this.$emit("timeChanged", this.currentTime);
      },
    },
    duration: function () {
      this.$module.scene.setDuration(this.duration);
    },
    minimapSettings: {
      deep: true,
      handler: "updateMinimapScissor",
    },
    render: function (val) {
      this.toggleRendering(val);
    },
    markerCluster: {
      handler: function (val) {
        this.$module.scene.enableMarkerCluster(val);
      },
      immediate: true,
    },
    markerLabels: function(labels) {
      for (const [key, value] of Object.entries(this.previousMarkerLabels)) {
        this.setMarkerModeForObjectsWithName(key, value, "off");
      }
      for (const [key, value] of Object.entries(labels)) {
        this.setMarkerModeForObjectsWithName(key, value, "on");
      }
      this.previousMarkerLabels = markRaw({...labels});
    },
    previousNerves: {
      handler: function (newVal, oldVal) {
        if (!this.sidebarSearch) {
          const pre = oldVal.map((nerve) => nerve.groupName);
          const cur = newVal.map((nerve) => nerve.groupName);
          if (haveSameElements(pre, cur)) return;
          this.handleNervesDisplay(oldVal)
          this.handleNervesDisplay(newVal, NERVE_CONFIG.COLOUR)
        }
      },
    },
  },
  beforeCreate: function () {
    this.$module = new OrgansViewer();
    this.selectedObjects = [];
    this.hoveredObjects = [];
    this.currentBackground = "white";
    this._currentURL = undefined;
    this.availableBackground = ["white", "black", "lightskyblue"];
    this.$_searchIndex = new SearchIndex();
  },
  mounted: function () {
    this.openMapRef = shallowRef(this.$refs.openMapRef);
    this.backgroundIconRef = shallowRef(this.$refs.backgroundIconRef);
    this.$refs.scaffoldTreeControls.setModule(this.$module);
    let eventNotifier = new EventNotifier();
    eventNotifier.subscribe(this, this.eventNotifierCallback);
    this.$module.addNotifier(eventNotifier);
    this.$module.addOrganPartAddedCallback(this.zincObjectAdded);
    this.$module.addOrganPartRemovedCallback(this.zincObjectRemoved);
    this.$module.initialiseRenderer(this.$refs.display);
    this.toggleRendering(this.render);
    this.ro = new ResizeObserver(this.adjustLayout).observe(
      this.$refs.scaffoldContainer
    );
    this.helpTextWait = [];
    this.helpTextWait.length = this.hoverVisibilities.length;
    this.defaultRate = this.$module.getPlayRate();
    this.$module.zincRenderer.addPreRenderCallbackFunction(() => {
      this.currentTime = this.$module.getCurrentTime();
    })
  },
  beforeUnmount: function () {
    if (this.ro) this.ro.disconnect();
    this.$module.destroy();
    this.$module = undefined;
  },
  computed: {
    ...mapState(useMainStore,  ['userToken']),
    annotationDisplay: function() {
      return this.viewingMode === 'Annotation' && this.tData.active === true &&
        (this.activeDrawMode !== "Point" && this.activeDrawMode !== 'LineString');
    },
    enableColourPicker: function() {
      return this.showColourPicker && this.colourRadio;
    },
    modeDescription: function () {
      let description = this.viewingModes[this.viewingMode];
      if (this.viewingMode === 'Annotation') {
        if (this.authorisedUser) {
          return description[1]
        }
        return description[0]
      };
      return description;
    },
  },
  methods: {
    /**
     * 
     * @param nerves list of nerves to be selected
     * @param colour with colour to modify the nerves display, if not provided, reset to default
     */
    handleNervesDisplay: function (nerves, colour) {
      nerves.forEach((nerve) => {
        if (nerve.isTubeLines) {
          const regionName = nerve.region.getName();
          const groupName = nerve.groupName;
          const nodeData = this.$refs.scaffoldTreeControls.getNodeDataByRegionAndGroup(regionName, groupName)
          const activeColour = nodeData.activeColour.toLowerCase();
          const defaultColour = nodeData.defaultColour.toLowerCase();
          const configColour = NERVE_CONFIG.COLOUR.toLowerCase();
          // if the active colour is the default or config colour
          // use the provided colour or default depends on whether the colour is provided
          // otherwise, use the active colour
          const usedColour =
            activeColour === defaultColour || activeColour === configColour
              ? colour || defaultColour
              : activeColour;
          this.$refs.scaffoldTreeControls.setColour(nodeData, usedColour)
          const radius = colour ? NERVE_CONFIG.RADIUS : 1;
          const radialSegments = NERVE_CONFIG.RADIAL_SEGMENTS;
          nerve.setTubeLines(radius, radialSegments);
        }
      })
    },
    /*
    setCheckedRegions: function (data) {
      this.checkedRegions = data;
    },
    */
    /**
     * 
     * @param nerves array of nerve names, show all nerves if empty
     * @param processed boolean, whether unselect all checkboxes
     */
    zoomToNerves: function (nerves, processed = false) {
      if (this.$module.scene) {
        this.sidebarSearch = processed;
        const nervesList = [];
        const regions = this.$module.scene.getRootRegion().getChildRegions();
        regions.forEach((region) => {
          const regionName = region.getName();
          if (regionName === 'Nerves') {
            if (processed) {
              nerves.forEach((nerve) => {
                const primitives = this.findObjectsWithGroupName(nerve);
                nervesList.push(...primitives);
              });
            }
          }
        });
        const box = nervesList.length ? 
          this.$module.scene.getBoundingBoxOfZincObjects(nervesList) : 
          this.$module.scene.getBoundingBox();
        this.handleNervesDisplay(this.previousNerves);
        this.handleNervesDisplay(nervesList, NERVE_CONFIG.COLOUR);
        this.previousNerves = nervesList;
        if (box) {
          this.$module.scene.viewAllWithBoundingBox(box);
        }
      }

      //The following hide all the other primitives
      /*
      if (this.$module.scene) {
        const idsList = [];
        const regions = this.$module.scene.getRootRegion().getChildRegions();
        regions.forEach((region) => {
          const regionName = region.getName();
          if (processed) {
            region.hideAllPrimitives();
            if (regionName === 'Nerves') {
              if (nerves.length) {
                const ids = nerves.reduce((acc, nerve) => {
                  const primitives = this.findObjectsWithGroupName(nerve)
                  const ids = primitives.map((object) => {
                    object.setVisibility(true);
                    return `${object.region.uuid}/${object.uuid}`;
                  });
                  acc.push(...ids);
                  return acc;
                }, []);
                idsList.push(...ids)
              } else {
                region.showAllPrimitives();
                idsList.push(region.uuid)
              }
            }
          } else {
            // if the checkboxes are checked previously, restore them
            const isChecked = this.checkedRegions.find(item => item.label === regionName);
            if (isChecked) {
              region.showAllPrimitives();
              idsList.push(region.uuid);
            }
          }
          
        });
        if (nerves.length) {
          this.fitWindow();
        }
        this.$refs.scaffoldTreeControls.setCheckedKeys(idsList, processed);
      }
      */
    },
    enableAxisDisplay: function (enable, miniaxes) {
      if (this.$module.scene) {
        this.$module.scene.enableAxisDisplay(enable, miniaxes);
      }
    },
    createAxisDisplay: function (fit) {
      if (this.$module.scene) {
        this.$module.scene.createAxisDisplay(fit);
      }
    },
    /**
     * @public
     * Call this to manually add a zinc object into the current scene.
     * This will subsequently trigger a zincObjectAdded
     * @arg {Object} "ZincObject object to be added"
     */
    addZincObject: function (zincObject) {
      if (this.$module.scene) {
        // zincObjectAdded will be alled in sequential callback
        this.$module.scene.addZincObject(zincObject);
      }
    },
    /**
     * Internal only.
     * This is called when a new zinc object is read into the scene.
     */
    zincObjectAdded: function (zincObject) {
      this.loading = false;
      this.$_searchIndex.addZincObject(zincObject, zincObject.uuid);
      if (this.timeVarying === false && zincObject.isTimeVarying()) {
        this.timeVarying = true;
      }
      //Temporary way to mark an object as nerves
      const regions = this.isNerves?.regions;
      if (regions) {
        const regionPath = zincObject.getRegion().getFullPath().toLowerCase();
        for (let i = 0; i < regions.length; i++) {
          if (regionPath.includes(regions[i].toLowerCase())) {
            zincObject.userData.isNerves = true;
            const groupName = zincObject.groupName.toLowerCase();
            if (groupName in nervesMap) {
              foundNerves++;
              zincObject.setAnatomicalId(nervesMap[groupName]);
              //console.log(groupName, zincObject.anatomicalId, zincObject.uuid)
            }
          } else {
            zincObject.userData.isNerves = false;
          }
        }

      }
      /**
       * Emit when a new object is added to the scene
       * @arg {Object} "The object added to the sceene"
       */
      this.$emit("zinc-object-added", zincObject);
    },
    /**
     * Internal only.
     * Remove an entry matching region and group from
     * local annotation list.
     */
    removeFromOfflineAnnotation: function(regionPath, groupName) {
      for (let i = 0; i < this.offlineAnnotations.length; i++) {
        const annotation = this.offlineAnnotations[i];
        if (annotation.region === regionPath &&
          annotation.group === groupName) {
          this.offlineAnnotations.splice(i, 1);
          return;
        }
      }
    },
    /**
     * Internal only.
     * This is called when a zinc object is removed.
     */
    zincObjectRemoved: function (zincObject) {
      if (this.$module.scene) {
        // zincObjectAdded will be alled in sequential callback
        const groupName = zincObject.groupName;
        const objects = zincObject.region.findObjectsWithGroupName(groupName, false);
        //Remove relevant objects from the rest of the app.
        if (objects.length === 0) {
          this.$_searchIndex.removeZincObject(zincObject, zincObject.uuid);
        }
      }
    },
    /**
     * Internal only.
     * Add regions to search index.
     */
    addRegionsToSearchIndex: function () {
      const rootRegion = this.$module.scene.getRootRegion();
      const regions = rootRegion.getChildRegions(true);
      regions.forEach(region => {
        this.$_searchIndex.addRegion(region, region.uuid);
      });
    },
    /**
     * Internal only.
     * This is called when Change backgspeedround colour button
     * is pressed an causes the backgrouColornd colour to be changed
     * to one of the three preset colour: white, black and
     * lightskyblue.
     */
    backgroundChangeCallback: function (colour) {
      this.currentBackground = colour;
      this.$module.zincRenderer
        .getThreeJSRenderer()
        .setClearColor(this.currentBackground, 1);
    },
    /**
     * Internal only.
     * This is called by captueeScreenshot and after the last render
     * loop, it download a screenshot of the current scene with no UI.
     */
    captureScreenshotCallback: function () {
      //Remove the callback, only needs to happen once
      this.$module.zincRenderer.removePostRenderCallbackFunction(
        this.captureID
      );
      let screenshot = this.$module.zincRenderer
        .getThreeJSRenderer()
        .domElement.toDataURL("image/png");
      let hrefElement = document.createElement("a");
      document.body.append(hrefElement);
      if (!this.captureFilename) hrefElement.download = `screenshot.png`;
      else hrefElement.download = this.captureFilename;
      hrefElement.href = screenshot;
      hrefElement.click();
      hrefElement.remove();
    },
    /**
     * @public
     * Function for capturing a screenshot of the current rendering.
     *
     * @arg {String} "filename given to the screenshot."
     */
    captureScreenshot: function (filename) {
      this.captureFilename = filename;
      this.captureID = this.$module.zincRenderer.addPostRenderCallbackFunction(
        this.captureScreenshotCallback
      );
    },
    /**
     * @public
     * Function to clear current scene, the tree controls and the search index.
     */
    clearScene: function () {
      if (this.$refs.scaffoldTreeControls) this.$refs.scaffoldTreeControls.clear();
      if (this.$_searchIndex) this.$_searchIndex.removeAll();
      if (this.$module.scene) this.$module.scene.clearAll();
    },
    /**
     * @public
     * Add and edit local annotations
     * @arg `region`,
     * @arg `group`,
     * @arg `zincObject`,
     * @arg `comment`
     */
    addAndEditAnnotations: function (region, group, zincObject, comment) {
      const annotation = addUserAnnotationWithFeature(this.annotator, this.userToken, zincObject,
        region, group, this.url, comment);
      this.existDrawnFeatures = markRaw(this.existDrawnFeatures.filter(feature => feature.id !== annotation.item.id));
      this.existDrawnFeatures.push(annotation.feature);
      if (this.offlineAnnotationEnabled) {
        annotation.group = group;
        let regionPath = region;
        if (regionPath.slice(-1) === "/") {
          regionPath = regionPath.slice(0, -1);
        }
        annotation.region = regionPath;
        this.offlineAnnotations = JSON.parse(sessionStorage.getItem('anonymous-annotation')) || [];
        this.offlineAnnotations.push(annotation);
        sessionStorage.setItem('anonymous-annotation', JSON.stringify(this.offlineAnnotations));
      }
      this.$emit('userPrimitivesUpdated', {region, group, zincObject});
    },
    /**
     * @public
     * Callback for when primitives have been update using primitive controls.
     * This is only called from callback.
     * @arg `object`
     */
    primitivesUpdated: function(object) {
      if (object.isZincObject && object.isEditable) {
        const group = object.groupName;
        const region = object.region.getFullPath();
        this.addAndEditAnnotations(region, group, object, "Position Updated");
      }
    },
    /**
     * @public
     * Confirm creation of new primitive. This is only called from callback.
     * @arg `payload`
     */
    confirmCreate: function(payload) {
      if (payload) {
        let object = undefined;
        if (payload.shape === "Point") {
          object = this.$module.scene.createPoints(
            payload.region,
            payload.group,
            this.createData.points,
            payload.group,
            0x0022ee,
          );
        } else if (payload.shape === "LineString") {
          object = this.$module.scene.createLines(
            payload.region,
            payload.group,
            [this.createData.points[0], this.createData.points[1]],
            0x00ee22,
          );
        } else if (payload.editingIndex > -1) {
          if (this._editingZincObject) {
            this._editingZincObject.editVertices([this.createData.points[1]],
              payload.editingIndex);
            const region = this._editingZincObject.region.getFullPath() + "/";
            const group = this._editingZincObject.groupName;
            this.addAndEditAnnotations(region, group, this._editingZincObject, "Position Updated");
          }
        }
        if (object) {
          this.addAndEditAnnotations(payload.region, payload.group, object.zincObject, "Create");
          object.zincObject.isEditable = true;
          this.tData.region = payload.region;
          this.tData.label = payload.group;
          this.changeActiveByName([payload.group], payload.region, false);
        }
      }
      this.cancelCreate();
    },
    /**
     * Internal only.
     * Cancel create workflows. Reset all relevant UIs and data.
     */
    cancelCreate: function() {
      this.createData.points.length = 0;
      this.createData.toBeConfirmed = false;
      this._editingZincObject = undefined;
      this.createData.editingIndex = -1;
      this.createData.faceIndex = -1;
      this.tData.visible = false;
      this.createData.toBeDeleted = false;
      if (this._tempLine) {
        this.$module.scene.removeTemporaryPrimitive(this._tempLine);
        this._tempLine = undefined;
      }
      if (this._tempPoint) {
        this.$module.scene.removeTemporaryPrimitive(this._tempPoint);
        this._tempPoint = undefined;
      }
      if (this.annotationSidebar){
        this.$emit("annotation-close");
      }
    },
    /**
     * Internal only.
     * Confirm delete of user created primitive.
     * This is only called from callback.
     */
    confirmComment: function (payload) {
      if (this._editingZincObject) {
        let annotation = payload
        if (this._editingZincObject.isEditable) {
          this.existDrawnFeatures = markRaw(this.existDrawnFeatures.filter(feature => feature.id !== annotation.item.id));
          this.existDrawnFeatures.push(payload.feature);
        }
        if (this.offlineAnnotationEnabled) {
          annotation.group = this._editingZincObject.groupName;;
          annotation.region = this._editingZincObject.region.getFullPath();
          this.offlineAnnotations = JSON.parse(sessionStorage.getItem('anonymous-annotation')) || [];
          this.offlineAnnotations.push(annotation);
          sessionStorage.setItem('anonymous-annotation', JSON.stringify(this.offlineAnnotations));
        }
      }
    },
    /**
     * Internal only.
     * Confirm delete of user created primitive.
     * This is only called from callback.
     */
    confirmDelete: function () {
      if (this._editingZincObject?.isEditable) {
        const regionPath = this._editingZincObject.region.getFullPath() + "/";
        const group = this._editingZincObject.groupName;
        const annotation = addUserAnnotationWithFeature(this.annotator, this.userToken,
          this._editingZincObject, regionPath, group, this.url, "Deleted");
        if (annotation) {
          this.existDrawnFeatures = markRaw(this.existDrawnFeatures.filter(feature => feature.id !== annotation.item.id));
          const childRegion = this.$module.scene.getRootRegion().findChildFromPath(regionPath);
          childRegion.removeZincObject(this._editingZincObject);
          if (this.offlineAnnotationEnabled) {
            this.offlineAnnotations = JSON.parse(sessionStorage.getItem('anonymous-annotation')) || [];
            this.offlineAnnotations = this.offlineAnnotations.filter(offline => offline.item.id !== annotation.item.id);
            sessionStorage.setItem('anonymous-annotation', JSON.stringify(this.offlineAnnotations));
          }
        }
      }
      this.cancelCreate();
    },
    /**
     * Internal only.
     * This is triggered when tooltip is hidden
     */
     onTooltipHide: function() {
      if (this.createData.toBeConfirmed && !this.annotationSidebar) {
        this.cancelCreate();
      }
    },
    formatTooltip(val) {
      if (this.timeMax >= 1000) {
        if (val) {
          let sec = ((val % 60000) / 1000).toFixed(2) + "s";
          let min = val > 60000 ? (val / 60000).toFixed(0) + "m " : "";
          return min + sec;
        }
      }
      return val ? val.toFixed(2) + " ms" : "0 ms";
    },
    /**
     * @public
     * Function to reset the view to default.
     * Also called when the associated button is pressed.
     */
    fitWindow: function () {
      if (this.$module.scene) {
        //We do not want the bounding box to affect the
        //bounding box calculation.
        let vis = false;
        if (this._boundingBoxGeo) {
          vis = this._boundingBoxGeo.getVisibility();
          this._boundingBoxGeo.setVisibility(false);
        }
        this.$module.scene.viewAll();
        if (this._boundingBoxGeo) {
          updateBoundingBox(this._boundingBoxGeo, this.$module.scene);
          //Resume the bounding box visibility
          this._boundingBoxGeo.setVisibility(vis);
        }
      }
    },
    /**
     * @public
     * Function to zoom in.
     * Also called when the associated button is pressed.
     */
    zoomIn: function () {
      if (this.$module.scene) {
        this.$module.scene.changeZoomByScrollRateUnit(-1);
      }
    },
    /**
     * Function to zoom out.
     * Also called when the associated button is pressed.
     *
     * @public
     */
    zoomOut: function () {
      if (this.$module.scene) {
        this.$module.scene.changeZoomByScrollRateUnit(1);
      }
    },
    /**
     * Function to change the current play speed.
     *
     * @public
     * @arg `speed`
     */
    speedChanged: function (speed) {
      this.currentSpeed = speed;
      this.$module.setPlayRate(this.defaultRate * this.currentSpeed);
    },
    /**
     * Function used to stop the free spin
     *
     * @public
     */
    stopFreeSpin: function () {
      let cameracontrol = this.$module.scene.getZincCameraControls();
      cameracontrol.stopAutoTumble();
      this.isTransitioning = false;
    },
    /**
     * Return a list of obejcts with the provided name.
     * @arg "Group name to search."
     *
     * @public
     */
    findObjectsWithGroupName: function (name) {
      let objects = [];
      if (name && name != "" && this.$module.scene) {
        objects = this.$module.scene.findObjectsWithGroupName(name);
      }
      return objects;
    },
    /**
     * @public
     * Switch active drawing type
     * @arg {String} `type`
     * @arg {String} `icon`
     */
    toggleDrawing: function (type, icon) {
      this.createData.toBeDeleted = false;
      if (type === 'mode') {
        this.cancelCreate()
        this.activeDrawMode = icon;
        this.createData.shape = '';
        this.$module.selectObjectOnPick = true;
      } else if (type === 'tool') {
        this.activeDrawTool = icon;
        this.createData.shape = this.activeDrawTool ? this.activeDrawTool : '';
        this.$module.selectObjectOnPick = false;
      }
    },
    /**
     * Toggle the drawing box which aid the drawing
     *
     * @public
     */
     toggleDrawingBox: function () {
      this.createData.drawingBox = !this.createData.drawingBox;
    },
    /**
     * Find and and zoom into objects with the provided list of names.
     * @arg "List of names"
     *
     * @public
     */
    viewRegion: function (names) {
      const rootRegion = this.$module.scene.getRootRegion();
      const groups = Array.isArray(names) ? names : [names];
      const objects = findObjectsWithNames(rootRegion, groups, "", true);
      let box = this.$module.scene.getBoundingBoxOfZincObjects(objects);
      if (box) {
        if (this.$module.isSyncControl()) {
          this.$module.setSyncControlZoomToBox(box);
        } else {
          const dist =
            this.$module.scene.camera.far - this.$module.scene.camera.near;
          this.$module.scene.viewAllWithBoundingBox(box);
          this.$module.scene.camera.far = this.$module.scene.camera.near + dist;
          this.$module.scene.camera.updateProjectionMatrix();
        }
        return true;
      }
      return false;
    },
    setFocusedRegion: function (name) {
      if (name) {
        if (this.isReady) {
          this.viewRegion(name);
        } else {
          this.$module.setFinishDownloadCallback(
            this.setURLFinishCallback({ region: name })
          );
        }
      }
    },
    updateViewURL: function (viewURL) {
      if (viewURL) {
        if (this.isReady) {
          const url = new URL(viewURL, this.url);
          this.$module.scene.loadViewURL(url);
        } else {
          this.$module.setFinishDownloadCallback(
            this.setURLFinishCallback({ viewURL: viewURL })
          );
        }
      }
    },
    createEditTemporaryLines: function(identifiers) {
      const worldCoords = identifiers[0].extraData.worldCoords;
      if (worldCoords) {
        if (this.createData.shape === "LineString" || this.createData.editingIndex > -1) {
          if (this.createData.points.length === 1)  {
            this.showRegionTooltipWithAnnotations(identifiers, true, false);
            this.tData.x = 50;
            this.tData.y = 200;
            if (this._tempLine) {
              const positionAttribute = this._tempLine.geometry.getAttribute( 'position' );
              positionAttribute.setXYZ(1, worldCoords[0], worldCoords[1], worldCoords[2]);
              positionAttribute.needsUpdate = true;
            } else {
              this._tempLine = this.$module.scene.addTemporaryLines(
                [this.createData.points[0], worldCoords], 0x00ffff);
            }
          }
        }
      }
    },
    draw: function(data) {
      if (data && data.length > 0 && data[0].data.group) {
        if (data[0].extraData.worldCoords) {
          if (this.createData.shape === "Point") {
            this.drawPoint(data[0].extraData.worldCoords, data);
          } else if (this.createData.shape === "LineString" ||
            this.createData.editingIndex > -1) {
            this.drawLine(data[0].extraData.worldCoords, data);
          }
        }
      }
    },
    drawPoint: function(coords, data) {
      if (this.createData.toBeConfirmed === false) {
        this.createData.points.length = 0;
        this.createData.points.push(coords);
        this.createData.toBeConfirmed = true;
        this.showRegionTooltipWithAnnotations(data, true, false);
        this.tData.x = 50;
        this.tData.y = 200;
        this._tempPoint = this.$module.scene.addTemporaryPoints([coords], 0xffff00);
      }
    },
    drawLine: function(coords, data) {
      if (this.createData.toBeConfirmed === false) {
        if (this.createData.points.length === 1) {
          this.createData.points.push(coords);
          this.createData.toBeConfirmed = true;
          this.showRegionTooltipWithAnnotations(data, true, false);
          this.tData.x = 50;
          this.tData.y = 200;
        } else {
          this._tempPoint = this.$module.scene.addTemporaryPoints([coords], 0xffff00);
          this.createData.points.push(coords);
        }
      }
    },
    /**
     * Return renderer information
     *
     * @public
     */
    getRendererInfo: function () {
      if (this.$module.zincRenderer) {
        return this.$module.zincRenderer.getThreeJSRenderer().info;
      }
      return undefined;
    },
    /**
     * Function used to rotate the scene.
     * Also called when the associated button is pressed.
     *
     * @public
     */
    freeSpin: function () {
      if (this.$module.scene) {
        let cameracontrol = this.$module.scene.getZincCameraControls();
        this.isTransitioning = true;
        cameracontrol.enableAutoTumble();
        cameracontrol.autoTumble([1.0, 0.0], Math.PI, true);
        setTimeout(this.stopFreeSpin, 4000);
      }
    },
    activateAnnotationMode: function(names, event) {
      if (this.authorisedUser || this.offlineAnnotationEnabled) {
        this.createData.toBeDeleted = false;
        if ((this.createData.shape !== "") || (this.createData.editingIndex > -1)) {
          // Create new shape bsaed on current settings
          if (names.length > 0) {
            if (event.identifiers[0].coords) {
              this.createData.x = event.identifiers[0].coords.x;
              this.createData.y = event.identifiers[0].coords.y;
              this.draw(event.identifiers);
            }
          }
        } else {
          //Make sure the tooltip is displayed with annotaion mode
          if (this.activeDrawMode === "Edit") {
            const editing = getEditableLines(event);
            if (editing) {
              this.activateEditingMode(editing.zincObject, editing.faceIndex,
                editing.vertexIndex, editing.point);
            }
          } else if (this.activeDrawMode === "Delete") {
            const zincObject = getDeletableObjects(event);
            if (zincObject) {
              this.createData.toBeDeleted = true;
              this._editingZincObject = zincObject;
            }
          }
          if (this.activeDrawMode !== "Point" && this.activeDrawMode !== "LineString") {
            this.showRegionTooltipWithAnnotations(event.identifiers, true, false);
          } else {
            this.showRegionTooltipWithAnnotations(event.identifiers, true, true);
          }
        }
      } else {
        this.showRegionTooltipWithAnnotations(event.identifiers, true, true);
      }
    },
    activateEditingMode: function(zincObject, faceIndex, vertexIndex, point) {
      this._editingZincObject = zincObject;
      this.createData.faceIndex = faceIndex;
      this.createData.editingIndex = vertexIndex;
      this.drawLine(point, undefined);
    },
    /**
     * Callback when a region is selected/highlighted.
     * It will also update other controls.
     *
     */
    eventNotifierCallback: function (event) {
      if (!(this.createData.toBeConfirmed || this.createData.toBeDeleted)) {
        const names = [];
        let zincObjects = [];
        if (event.eventType == 1 || event.eventType == 2) {
          event.identifiers.forEach((identifier) => {
            if (identifier) {
              let id = identifier.data.id
                ? identifier.data.id
                : identifier.data.group;
              names.push(id);
            }
          });
          zincObjects = event.zincObjects;
        }
        let id = undefined;
        let regionPath = undefined;
        if (event.identifiers.length > 0 && event.identifiers[0]) {
          id = event.identifiers[0].data.id
                ? event.identifiers[0].data.id
                : event.identifiers[0].data.group;
          if (event.identifiers[0].data.region) {
            regionPath = event.identifiers[0].data.region;
          }
        }
        /*
        * Event Type 1: Selected
        * Event Type 2: Highlighted
        * Event Type 3: Move
        */
        if (event.eventType == 1) {
          if (this.viewingMode === 'Annotation') {
            this.tData.label = id;
            this.tData.region = regionPath;
            const zincObject = getClickedObjects(event);
            this._editingZincObject = zincObject;
            if (zincObject) {
              const regionPath = this._editingZincObject.region.getFullPath() + "/";
              const group = this._editingZincObject.groupName;
              this.annotationFeature = createNewAnnotationsWithFeatures(this._editingZincObject,
                regionPath, group, this.url, '').feature;
            }
            this.activateAnnotationMode(names, event);
          } else {
            if (this.$refs.scaffoldTreeControls) {
              if (names.length > 0) {
                this.$refs.scaffoldTreeControls.updateActiveUI(zincObjects);
                this.updatePrimitiveControls(zincObjects);
              } else {
                this.hideRegionTooltip();
                this.$refs.scaffoldTreeControls.removeActive(false);
              }
            }
            if (!this.sidebarSearch) {
              this.previousNerves = zincObjects;
            }
            //Store the following for state saving. Search will handle the case with more than 1
            //identifiers.
            if (event.identifiers.length === 1) {
              this.lastSelected = {
                isSearch: false,
                region: regionPath,
                group: event.identifiers[0].data.group,
              }
            } else if (event.identifiers.length === 0) {
              this.lastSelected = {
                isSearch: false,
                region: "",
                group: "",
              }
            }
            /**
             * Emit when an object is selected
             * @arg {Object} "Identifier of selected objects"
             */
            this.$emit("scaffold-selected", event.identifiers);
          }
        } else if (event.eventType == 2) {
          if (this.selectedObjects.length === 0) {
            this.hideRegionTooltip();
            if (this.$refs.scaffoldTreeControls) {
              if (names.length > 0) {
                this.$refs.scaffoldTreeControls.updateHoverUI(zincObjects);
              } else {
                this.$refs.scaffoldTreeControls.removeHover(true);
              }
            }
            if (event.identifiers.length > 0 && event.identifiers[0]) {
              if (event.identifiers[0].coords) {
                this.tData.active = false;
                if (this.viewingMode !== "Annotation" ||  !this.annotationSidebar) {
                  this.tData.visible = true;
                }
                this.tData.label = id;
                this.tData.region = regionPath;
                this.tData.x = event.identifiers[0].coords.x;
                this.tData.y = event.identifiers[0].coords.y;
                this.createEditTemporaryLines(event.identifiers);
              }
            }
            /**
             * Emit when an object is highlighted
             * @arg {Object} "Identifier of selected objects"
             */
            this.$emit("scaffold-highlighted", event.identifiers);
          }
        } else if (event.eventType == 3) {
          //MOVE
          if (event.identifiers.length > 0 && event.identifiers[0]) {
            if (event.identifiers[0].coords) {
              const offsets =
                this.$refs.scaffoldContainer.getBoundingClientRect();
              this.tData.x = event.identifiers[0].coords.x - offsets.left;
              this.tData.y = event.identifiers[0].coords.y - offsets.top;
            }
            this.createEditTemporaryLines(event.identifiers);
          }
        }
      }
    },
    /**
     * Get the coordinates of the current selected region.
     *
     * @public
     */
    getCoordinatesOfSelected: function () {
      if (this.selectedObjects && this.selectedObjects.length > 0) {
        return this.$module.scene.getObjectsScreenXY(this.selectedObjects);
      }
      return undefined;
    },
    /**
     * Return an object containing the window coordinates of the
     * current selected region which will be updated after each render
     * loop.
     *
     * @public
     */
    getDynamicSelectedCoordinates: function () {
      return this.$module.selectedScreenCoordinates;
    },
    /**
     * Callback when time is changed through the UI.
     */
    timeChange: function (event) {
      let normalizedTime = (event / this.timeMax) * 100;
      if (normalizedTime != this.currentTime) {
        this.$module.updateTime(normalizedTime);
      }
    },
    /**
     * Update primitive controls UI with the specified objects
     *
     * @arg objects objects to be set for the selected
     */
    updatePrimitiveControls: function (objects) {
      if (this.viewingMode === 'Exploration' || this.viewingMode === 'Annotation') {
        this.selectedObjects = objects;
        if (this.selectedObjects && this.selectedObjects.length > 0) {
          this.$refs.primitiveControls.setObject(this.selectedObjects[0]);
        } else {
          this.$refs.primitiveControls.setObject(undefined);
        }
      }
    },
    /**
     * A callback used by children components. Set the selected zinc object
     *
     * @arg Selected zinc objects
     * @arg Flag to determine if callback should be triggered when new selection
     * is made
     */
    objectSelected: function (objects, propagate) {
      if (!this.sidebarSearch) {
        this.previousNerves = objects;
      }
      this.updatePrimitiveControls(objects);
      this.$module.setSelectedByZincObjects(objects, undefined, {}, propagate);
    },
    /**
     * A callback used by children components. Set the highlighted zinc object
     *
     * @arg Hovered zinc objects
     * @arg Flag to determine if callback should be triggered when new selection
     * is made
     */
    objectHovered: function (objects, propagate) {
      this.hoveredObjects = objects;
      this.$module.setHighlightedByZincObjects(objects, undefined, {}, propagate);
    },
    /**
     * Set the selected by name.
     *
     * @param {} name Name of the group
     */
    changeActiveByName: function (names, region, propagate) {
      const isArray = Array.isArray(names);
      if (names === undefined || (isArray && names.length === 0)) {
        this.$refs.scaffoldTreeControls.removeActive(propagate);
      } else {
        let array = names;
        if (!isArray) array = [array];
        this.$refs.scaffoldTreeControls.changeActiveByNames(array, region, propagate);
      }
    },
    /**
     * Set the highlighted by name.
     *
     * @param {name} name Name of the group
     */
    changeHighlightedByName: function (names, region, propagate) {
      const isArray = Array.isArray(names);
      if (names === undefined || (isArray && names.length === 0)) {
        this.$refs.scaffoldTreeControls.removeHover(propagate);
      } else {
        let array = names;
        if (!isArray) array = [array];
        this.$refs.scaffoldTreeControls.changeHoverByNames(array, region, propagate);
      }
    },
    /**
     * @public
     * Start the animation.
     *
     * @arg "flag to turn the animation on/off"
     */
    play: function (flag) {
      this.$module.playAnimation(flag);
      this.isPlaying = flag;
      //Hide tooltip as location may
      //this.hideRegionTooltip();
    },
    /**
     * @public
     * Function to toggle on/off overlay help.
     */
    setHelpMode: function (helpMode) {
      const toolTipsLength = this.hoverVisibilities.length;
      const lastIndex = toolTipsLength - 1;
      const activePopoverObj = this.hoverVisibilities[this.helpModeActiveIndex];

      if (activePopoverObj) {
        const popoverRefsId = activePopoverObj?.refs;
        const popoverRefId = activePopoverObj?.ref;
        const popoverRef = this.$refs[popoverRefsId ? popoverRefsId : popoverRefId];

        if (!popoverRef) {
          // skip the unavailable tooltips
          this.helpModeActiveIndex += 1;
        }
      }

      if (!helpMode) {
        // reset to iniital state
        this.helpModeActiveIndex = this.helpModeInitialIndex;
      }

      if (helpMode && this.helpModeActiveIndex >= lastIndex) {
        /**
         * This event is emitted when the tooltips in help mode reach the last item.
         */
        this.$emit('help-mode-last-item', true);
      }

      if (helpMode && !this.helpModeDialog) {
        this.inHelp = true;
        this.hoverVisibilities.forEach((item) => {
          item.value = true;
        });
      } else if (helpMode && this.helpModeDialog && toolTipsLength > this.helpModeActiveIndex) {

        // Show the map tooltip as first item
        if (this.helpModeActiveIndex > -1) {

          // wait for CSS transition
          setTimeout(() => {
            this.inHelp = false;
            this.hoverVisibilities.forEach((item) => {
              item.value = false;
            });

            this.showHelpText(this.helpModeActiveIndex, 200);
          }, 300);
        }
      } else {
        this.inHelp = false;
        this.hoverVisibilities.forEach((item) => {
          item.value = false;
        });
      }
    },
    /**
     * Callback function used by showRegionTooltip in the case when the tooltip
     * is out of view.
     */
    displayTooltipOfObjectsCallback: function (
      name,
      objects,
      regionPath,
      resetView,
      liveUpdates
    ) {
      const instance = this;
      return function () {
        instance.$module.zincRenderer.removePostRenderCallbackFunction(
          instance.$_regionTooltipCallback
        );
        instance.$_regionTooltipCallback = undefined;
        instance.displayTooltipOfObjects(name, objects, regionPath, resetView, liveUpdates);
      };
    },
    liveUpdateTooltipPosition: function () {
      if (this.$module.selectedCenter) {
        this.tData.x = this.$module.selectedScreenCoordinates.x;
        this.tData.y = this.$module.selectedScreenCoordinates.y;
      }
    },
    displayTooltipOfObjects: function (name, objects, regionPath, resetView, liveUpdates) {
      if (objects.length > 0) {
        let coords = objects[0].getClosestVertexDOMElementCoords(
          this.$module.scene
        );
        if (coords) {
          //The coords is not in view, view all if resetView flag is true
          if (!coords.inView) {
            this.hideRegionTooltip();
            if (resetView) {
              this.$module.scene.viewAll();
              //Use the post render callback to make sure the scene has been updated
              //before getting the position of the tooltip.
              if (this.$_regionTooltipCallback) {
                this.$module.zincRenderer.removePostRenderCallbackFunction(
                  this.$_regionTooltipCallback
                );
              }
              this.$_regionTooltipCallback =
                this.$module.zincRenderer.addPostRenderCallbackFunction(
                  this.displayTooltipOfObjectsCallback(
                    name,
                    objects,
                    regionPath,
                    resetView,
                    liveUpdates
                  )
                );
            }
          } else {
            if (!name.includes("Search Results for")) {
              this.tData.active = true;
            } else {
              this.tData.active = false;
            }
            this.tData.visible = true;
            this.tData.label = name;
            this.tData.x = coords.position.x;
            this.tData.y = coords.position.y;
            this.tData.region = regionPath;
            if (this.$_liveCoordinatesUpdated) {
              this.$module.zincRenderer.removePostRenderCallbackFunction(
                this.$_liveCoordinatesUpdated
              );
            }
            if (liveUpdates) {
              this.$module.setupLiveCoordinates(objects);
              this.$_liveCoordinatesUpdated =
                this.$module.zincRenderer.addPostRenderCallbackFunction(
                  this.liveUpdateTooltipPosition
                );
            }
          }
          return true;
        }
      }
      this.hideRegionTooltip();
      return false;
    },
    /**
     * Display the tooltip used for displaying search result.
     * When resetView is set to true, it will
     * reset view if the tooltip is not in view.
     * Setting liveUpdates to true will update the tooltip location
     * at every rendering loop.
     */
    showRegionTooltipWithObjects: function (label, zincObjects, regionPath, resetView, liveUpdates) {
      if (label && zincObjects && zincObjects.length > 0 && this.$module.scene) {
        return this.displayTooltipOfObjects(
          label,
          zincObjects,
          regionPath,
          resetView,
          liveUpdates
        );
      }
      this.hideRegionTooltip();
      return false;
    },
    /**
     * Display the tooltip. When resetView is set to true, it will
     * reset view if the tooltip is not in view.
     * Setting liveUpdates to true will update the tooltip location
     * at every rendering loop.
     */
    showRegionTooltip: function (name, resetView, liveUpdates) {
      if (name && this.$module.scene) {
        const rootRegion = this.$module.scene.getRootRegion();
        const groups = [name];
        const objects = findObjectsWithNames(rootRegion, groups, "", true);
        let regionPath = undefined;
        if (objects && objects.length > 0) {
          regionPath = objects[0].getRegion().getFullPath();
        }
        return this.showRegionTooltipWithObjects(
          name,
          objects,
          regionPath,
          resetView,
          liveUpdates
        );
      }
      this.hideRegionTooltip();
      return false;
    },
    /**
     * Display the tooltip using the list of annotations.
     * When resetView is set to true, it will
     * reset view if the tooltip is not in view.
     * Setting liveUpdates to true will update the tooltip location
     * at every rendering loop.
     */
    showRegionTooltipWithAnnotations: function (annotations, resetView, liveUpdates) {
      if (this.$module.scene) {
        const result = getObjectsFromAnnotations(this.$module.scene, annotations);
        if (result && result.objects.length > 0) {
          if (!this.annotationSidebar) {
            return this.showRegionTooltipWithObjects(
              result.label,
              result.objects,
              result.regionPath,
              resetView,
              liveUpdates
            );
          } else {
            const region = this.tData.region ? this.tData.region +"/" : "";
            const annotationEntry = [{
              "featureId": region + this.tData.label,
              "resourceId": this.url,
              "resource": this.url,
              "feature": this.annotationFeature,
              "offline": this.offlineAnnotationEnabled,
            }];
            this.$emit('annotation-open', {
              annotationEntry: annotationEntry,
              createData: this.createData,
              confirmCreate: this.confirmCreate,
              cancelCreate: this.cancelCreate,
              confirmDelete: this.confirmDelete,
              confirmComment: this.confirmComment
            });
            return;
          }
        }
      }
      this.hideRegionTooltip();
      return false;
    },
    clearAnnotationFeature: function () {
      const annotations = this.getOfflineAnnotations();
      const featureGroups = this.existDrawnFeatures.map(feature => decodeURIComponent(feature.id).split("/").pop());
      featureGroups.forEach((name) => {
        const zincObject = this.$module.scene.findObjectsWithGroupName(name, false);
        if (zincObject && zincObject.length) {
          const regionPath = zincObject[0].region.getFullPath() + "/";
          const childRegion = this.$module.scene.getRootRegion().findChildFromPath(regionPath);
          childRegion.removeZincObject(zincObject[0]);
        }
      })
      this.$refs.scaffoldTreeControls.removeRegion('__annotation');
      // Offline annotations are removed when switch viewing mode
      // Restore data in case need to save settings, doesn't affect anything
      this.offlineAnnotations = annotations;
    },
    addAnnotationFeature: async function () {
      let drawnFeatures;
      if (this.offlineAnnotationEnabled) {
        this.offlineAnnotations = JSON.parse(sessionStorage.getItem('anonymous-annotation')) || [];
        drawnFeatures = this.offlineAnnotations.filter((offline) => {
          return offline.resource === this.url && offline.feature.properties.drawn;
        }).map(offline => offline.feature);
      } else {
        drawnFeatures = [];
        const drawn = await getDrawnAnnotations(this.annotator, this.userToken, this.url);
        if (drawn && drawn.features) {
          drawnFeatures = [...drawn.features];
        }
        const drawnEncode = await getDrawnAnnotations(this.annotator, this.userToken, encodeURIComponent(this.url));
        if (drawnEncode && drawnEncode.features) {
          drawnFeatures = [...drawnFeatures, ...drawnEncode.features];
        }
      }
      this.existDrawnFeatures = markRaw(drawnFeatures);
      annotationFeaturesToPrimitives(this.$module.scene, drawnFeatures);
    },
    /**
     * Callback on viewing mode change
     * Optional, can be used to update the view mode.
     */
    changeViewingMode: function (modeName) {
      let nonNervesIsPickable = true;
      if (this.$module) {
        if (modeName) {
          this.viewingMode = modeName;
        }
        this.clearAnnotationFeature();
        if (this.viewingMode === "Annotation") {
          this.loading = true;
          this.annotator.authenticate(this.userToken).then((userData) => {
            if (userData.name && userData.email && userData.canUpdate) {
              this.authorisedUser = userData;
              this.offlineAnnotationEnabled = false;
            } else {
              this.authorisedUser = undefined;
              this.offlineAnnotationEnabled = true;
            }
            this.emitOfflineAnnotationUpdate();
            this.addAnnotationFeature();
            this.loading = false;
          });
        } else if (this.viewingMode === "Exploration") {
          this.activeDrawTool = undefined;
          this.activeDrawMode = undefined;
          this.createData.shape = "";
        } else if (this.viewingMode === "Neuron Connection") {
          nonNervesIsPickable = false;
        }
        if ((this.viewingMode === "Exploration") ||
          (this.viewingMode === "Annotation") &&
          (this.createData.shape === "")) {
            this.$module.selectObjectOnPick = true;
        } else {
          this.$module.selectObjectOnPick = false;
        }
        this.cancelCreate();
        if (modeName) {
          this.setNonNervesIsPickable(nonNervesIsPickable);
        }
      }
    },
    /**
     * Function to emit offline annotation enabled status
     */
    emitOfflineAnnotationUpdate: function () {
      this.$emit('update-offline-annotation-enabled', this.offlineAnnotationEnabled);
    },
    /**
     * @public
     * Hide the tooltip
     */
    hideRegionTooltip: function () {
      if (this.$_liveCoordinatesUpdated) {
        this.$module.zincRenderer.removePostRenderCallbackFunction(
          this.$_liveCoordinatesUpdated
        );
        //Unset the tracking
        this.$module.setupLiveCoordinates(undefined);
      }
      this.tData.active = false;
      this.tData.visible = false;
      this.tData.region = undefined;
    },
    /**
     * Currently will only apply to non-nerve object
     * @param flag boolean to control whether objects pickable
     */
    setNonNervesIsPickable: function (flag) {
      const objects = this.$module.scene.getRootRegion().getAllObjects(true);
      objects.forEach((zincObject) => {
        if (!zincObject.userData.isNerves) zincObject.setIsPickable(flag);
      });
    },
    /**
     * 
     * @param flag boolean
     * @param nerves array of nerve names
     */
    setGreyScale: function (flag, nerves = []) {
      const objects = this.$module.scene.getRootRegion().getAllObjects(true);
      objects.forEach((zincObject) => {
        if (nerves.length) {
          const groupName = zincObject.groupName.toLowerCase();
          if (zincObject.userData.isNerves) {
            if (!nerves.includes(groupName)) zincObject.setGreyScale(flag);
          }
        } else {
          if (!zincObject.userData.isNerves) zincObject.setGreyScale(flag);
        }
      });
      this.$refs.scaffoldTreeControls.updateAllNodeColours();
    },
    /**
     * @public
     * Function to toggle colour/greyscale of primitives.
     * The parameter ``flag`` is a boolean, ``true`` (colour) and ``false`` (greyscale).
     * @arg {Boolean} `flag`
     */
    setColour: function (flag, forced = false) {
      if (this.isReady && this.$module.scene &&
        typeof flag === "boolean" && 
        (forced || flag !== this.colourRadio)) {
        this.loading = true;
        //This can take sometime to finish , nextTick does not bring out
        //the loading screen so I opt for timeout loop here.
        setTimeout(() => {
          this.setGreyScale(!flag)
          this.loading = false;
          this.colourRadio = flag;
        }, 100);
      }
    }, 
    /**
     * @public
     * Function to toggle lines graphics.
     * The parameter ``flag`` is a boolean, ``true`` to show lines, ``false`` to hide them.
     * @arg {Boolean} `flag`
     */
     setOutlines: function (flag, forced = false) {
      if (this.isReady && this.$module.scene &&
        typeof flag === "boolean" && 
        (forced || flag !== this.outlinesRadio)) {
        this.outlinesRadio = flag;
        this.$nextTick(() => this.$refs.scaffoldTreeControls.setOutlines(flag));
      }
    },
    /**
     * Set the marker modes for objects with the provided name, mode can
     * be "on", "off" or "inherited".
     * Value can either be number or an object containing number and
     * imgURL.
     */
    setMarkerModeForObjectsWithName: function (name, value, mode) {
      if (name && this.$module.scene) {
        let options = value;
        if (typeof value === 'number') {
          options = { number: value, imgURL: undefined };
        }
        const rootRegion = this.$module.scene.getRootRegion();
        const groups = [name];
        const objects = findObjectsWithNames(rootRegion, groups, "", true);
        objects.forEach(object => object.setMarkerMode(mode, options));
      }
    },
    /**
     * @public
     * Set the marker modes for objects specified by the list of annotations
     * @arg `annotations`
     * @arg `mode`
     */
    setMarkerModeWithAnnotations: function (annotations, mode) {
      if (this.$module.scene) {
        const result = getObjectsFromAnnotations(this.$module.scene, annotations);
        if (result && result.objects.length > 0) {
          result.objects.forEach(object => object.setMarkerMode(mode));
        }
      }
    },
    /**
     * This is called when mouse cursor enters supported elements
     * with help tootltips.
     */
    showHelpText: function (helpTextNumber, timeout = 500) {
      if (!this.inHelp) {
        clearTimeout(this.helpTextWait[helpTextNumber]);
        this.helpTextWait[helpTextNumber] = setTimeout(() => {
          this.hoverVisibilities[helpTextNumber].value = true;
          /**
           * This event is emitted after a tooltip in Flatmap is shown.
           */
          this.$emit('shown-tooltip');
        }, timeout);
      }
    },
    /**
     * This is called when mouse cursor exits supported element..
     */
    hideHelpText: function (helpTextNumber, timeout = 500) {
      if (!this.inHelp) {
        clearTimeout(this.helpTextWait[helpTextNumber]);
        this.helpTextWait[helpTextNumber] = setTimeout(() => {
          this.hoverVisibilities[helpTextNumber].value = false;
        }, timeout);
      }
    },
    /**
     * @public
     *
     * Search a object and display the tooltip
     * @arg "text to search across"
     * @arg "toggle the tooltip if this is set"
     */
    search: function (text, displayLabel) {
      if (this.$_searchIndex) {
        if (text === undefined || text === "" ||
          ((Array.isArray(text) && text.length === 0))
        ) {
          this.lastSelected = {
            region: "",
            group: "",
            isSearch: true,
          }
          this.objectSelected([], true);
          return false;
        } else {
          this.lastSelected = {
            region: "",
            group: text,
            isSearch: true,
          }
          const result = this.$_searchIndex.searchAndProcessResult(text);
          const zincObjects = result.zincObjects;
          if (zincObjects.length > 0) {
            this.objectSelected(zincObjects, true);
            if (displayLabel) {
              for (let i = 0; i < zincObjects.length; i++) {
                if (zincObjects[i] && zincObjects[i].groupName) {
                  this.showRegionTooltipWithObjects(
                    result.label,
                    zincObjects,
                    result.regionPath,
                    true,
                    true
                  );
                }
              }
            }
            return true;
          } else {
            this.objectSelected([], true);
          }
        }
      }
      return false;
    },
    /**
     * @public
     *
     * Get the list of suggested terms based on the provided term.
     * This can be used for autocomplete.
     * @arg `term`
     */
    fetchSuggestions: function (term) {
      if (this.$_searchIndex === undefined) return [];
      return this.$_searchIndex.auto_suggest(term);
    },
    /**
     * Called when minimap settings has changed. Pass the
     * parameters to ZincJS and marked it for update.
     */
    updateMinimapScissor: function () {
      Object.keys(this.minimapSettings).forEach((key) => {
        this.$module.scene.minimapScissor[key] = this.minimapSettings[key];
      });
      this.$module.scene.minimapScissor.updateRequired = true;
    },
    updateSettingsfromScene: function () {
      this.currentSpeed = 1;
      this.$module.setPlayRate(this.defaultRate);
      this.orginalDuration =
        this.$module.scene.getMetadataTag("OriginalDuration");
      this.animateDuration = this.$module.scene.getMetadataTag("Duration");
      let timeStamps = this.$module.scene.getMetadataTag("TimeStamps");
      this.timeStamps = {};
      for (const key in timeStamps) {
        this.timeStamps[timeStamps[key]] = key;
      }
      this.timeMax = this.$module.scene.getDuration();
    },
    restoreSettings: function(options) {
      if (options) {
        if (options.viewport) {
          this.$module.scene
            .getZincCameraControls()
            .setCurrentCameraSettings(options.viewport);
        } else if (options.viewURL && options.viewURL !== "") {
          const url = new URL(options.viewURL, this.url);
          this.$module.scene.loadViewURL(url);
        } else if (options.region && options.region !== "") {
          this.viewRegion(options.region);
        }
        if (options.visibility) {
          // Some UIs may not be ready at this time.
          this.$nextTick(() => {
            this.$refs.scaffoldTreeControls.setState(options.visibility);
          });
        }
        if (options.background) {
          this.backgroundChangeCallback(options.background);
        }
        if ("colour" in options) {
          this.setColour(options.colour);
        }
        if (options.offlineAnnotations) {
          sessionStorage.setItem('anonymous-annotation', options.offlineAnnotations);
        }
        if ("outlines" in options) { 
          this.setOutlines(options.outlines);
        }
        if (options.viewingMode) {
          this.changeViewingMode(options.viewingMode);
        }
        const search = options.search;
        if (search && search.group) {
          if (search.isSearch) {
            this.search(search.group, true);
          } else {
            this.changeActiveByName(search.group, search.region, true);
          }
        }
      }
    },
    downloadErrorCallback: function() {
      return (error) => {
        this.$emit('on-error', error);
      }
    },
    setURLFinishCallback: function (options) {
      return () => {
        this.offlineAnnotations.length = 0;
        this.updateSettingsfromScene();
        this.$module.updateTime(0.01);
        this.$module.updateTime(0);
        this.$module.unsetFinishDownloadCallback();
        this.addRegionsToSearchIndex();
        /**
         * Emit when all objects have been loaded
         */
        this.setMarkers();
        //Create a bounding box.
        this._boundingBoxGeo = this.$module.scene.addBoundingBoxPrimitive(
          "_helper", "boundingBox", 0x40E0D0, 0.15);
        //Create planes.
        this._slides = this.$module.scene.addSlicesPrimitive(
          "_helper", ["x-plane", "y-plane", "z-plane"], [0xFF5555, 0x55FF55, 0x5555FF],
          0.5);
        const {centre, size} = this.$module.getCentreAndSize();
        this.boundingDims.centre = centre;
        this.boundingDims.size = size;
        //this.$module.scene.createAxisDisplay(false);
        //this.$module.scene.enableAxisDisplay(true, true);
        this.isReady = true;
        //console.log(`Total ${totalNerves}, found ${foundNerves}`);
        this.$nextTick(() => {
          this.restoreSettings(options);
          this.$emit("on-ready");
        });
      };
    },
    /**
     * Function used for getting the current states of the scene. This exported states
     * can be imported using the importStates method.
     *
     * @public
     */
    getState: function () {
      let state = {
        format: this.fileFormat,
        url: this._currentURL,
        viewport: undefined,
        visibility: undefined,
        background: this.currentBackground,
        colour: this.colourRadio,
        outlines: this.outlinesRadio,
        viewingMode: this.viewingMode,
      };
      if (this.$refs.scaffoldTreeControls)
        state.visibility = this.$refs.scaffoldTreeControls.getState();
      if (this.$module.scene) {
        let zincCameraControls = this.$module.scene.getZincCameraControls();
        state.viewport = zincCameraControls.getCurrentViewport();
      }
      if (this.lastSelected && this.lastSelected.group) {
        state.search = {...this.lastSelected};
      }
      if (this.offlineAnnotationEnabled) {
        state.offlineAnnotations = sessionStorage.getItem('anonymous-annotation');
      }
      return state;
    },
    /**
     * Function used for importing the states of the scene. This exported states
     * can be imported using the read states method.
     *
     * @public
     * @arg `state`
     */
    setState: function (state) {
      if (state) {
        if (state.url && state.url !== this._currentURL) {
          this.setURLAndState(state.url, {
            fileFormat: state.fileFormat,
            viewport: state.viewport,
            visibility: state.visibility,
            background: state.background,
            colour: state.colour,
            outlines: state.outlines,
            viewingMode: state.viewingMode,
            search: state.search,
            offlineAnnotations: state.offlineAnnotations,
          });
        } else {
          if (state.background || state.colour || state.search || state.outlines ||
          state.viewport || state.viewingMode || state.visibility) {
            if (this.isReady && this.$module.scene) {
              this.restoreSettings(state);
            } else {
              this.$module.setFinishDownloadCallback(
                this.setURLFinishCallback({
                  background: state.background,
                  colour: state.colour,
                  search: state.search,
                  offlineAnnotations: state.offlineAnnotations,
                  outlines: state.outlines,
                  viewingMode: state.viewingMode,
                  viewport: state.viewport,
                  visibility: state.visibility,
                })
              );
            }
          }
        }
      }
    },
    /**
     * export current scene in GLTF.
     * @arg "Return in binary form when set to true"
     *
     * @public
     */
    exportGLTF: function (binary) {
      return this.$module.scene.exportGLTF(binary);
    },
    /**
     * Return a copy of the local annotations list.
     * This list is used for storing user created annotation
     * when offlineAnnotationEnabled is set to true.
     *
     * @public
     */
    getOfflineAnnotations: function () {
      return [...this.offlineAnnotations];
    },
    /**
     * Import local annotations. The annotations will only
     * be imported when offlineAnnotationEnabled is set to
     * true;
     *
     * @public
     * @arg {Array} `annotationsList`
     */
    importOfflineAnnotations: function (annotationsList) {
      if (this.offlineAnnotationEnabled) {
        //Make sure the annotations are encoded correctly
        annotationsList.forEach(annotation => {
          const group = annotation.group;
          const region = annotation.region;
          let fullName = region.slice(-1) === "/" ? region : region + "/";
          const noSlash = fullName.slice(0, -1);
          annotation.region = noSlash;
          fullName = fullName + group;
          const featureID = fullName;
          annotation.item.id = featureID;
          annotation.feature.id = featureID;
        });
        const featuresList = annotationsList.map((annotation) => annotation.feature);
        annotationFeaturesToPrimitives(this.$module.scene, featuresList);
        //Make a local non-reactive copy.
        annotationsList.forEach((annotation) => {
          this.offlineAnnotations.push({...annotation});
        });
        sessionStorage.setItem('anonymous-annotation', JSON.stringify(this.offlineAnnotations));
      }
    },

    /**
     * Function used for reading in new scaffold metadata and a custom
     * viewport. This function will ignore the state prop and
     * read in the new url.
     *
     * @public
     * @arg `newValue`
     * @arg `state`
     */
    setURLAndState: function (newValue, state) {
      if (newValue != this._currentURL) {
        if (state?.format) this.fileFormat = state.format;
        this._currentURL = newValue;
        if (this.$refs.scaffoldTreeControls) this.$refs.scaffoldTreeControls.clear();
        this.loading = true;
        this.timeVarying = false;
        this.isReady = false;
        this.$_searchIndex.removeAll();
        this.hideRegionTooltip();
        this.$module.setDownloadErrorCallback(
          this.downloadErrorCallback()
        );
        this.$module.setFinishDownloadCallback(
          this.setURLFinishCallback({
            background: state?.background,
            colour: state?.colour,
            outlines: state?.outlines,
            region: this.region,
            search: state?.search,
            viewingMode: state?.viewingMode,
            viewURL: this.viewURL,
            viewport: state?.viewport,
            visibility: state?.visibility,
            offlineAnnotations: state?.offlineAnnotations,
          })
        );
        if (this.fileFormat === "gltf") {
          this.$module.loadGLTFFromURL(newValue, "scene", true);
        } else {
          this.$module.loadOrgansFromURL(
            newValue,
            undefined,
            undefined,
            "scene",
            undefined,
            true
          );
        }
        if (this.$module && this.$module.scene) {
          this.$module.scene.displayMarkers = this.displayMarkers;
          this.$module.scene.forcePickableObjectsUpdate = true;
          this.$module.scene.displayMinimap = this.displayMinimap;
          this.updateMinimapScissor();
        }
      }
    },
    /**
     * Function used for reading in new scaffold metadata. This function will ignore
     * the state prop and read in the new url.
     *
     * @public
     * @arg `newValue`
     */
    setURL: function (newValue) {
      this.setURLAndState(newValue, undefined);
    },
    /**
     * Callback when drawer is toggled.
     */
    drawerToggled: function (flag) {
      this.drawerOpen = flag;
      this.adjustLayout();
    },
    /**
     * Callback using ResizeObserver.
     */
    adjustLayout: function () {
      if (this.$refs.scaffoldContainer) {
        let width = this.$refs.scaffoldContainer.clientWidth;
        this.minimisedSlider = width < 812;
        if (this.minimisedSlider) {
          this.sliderPosition = this.drawerOpen ? "right" : "left";
        } else {
          this.sliderPosition = "";
        }
      }
    },
    toggleRendering: function (flag) {
      if (this.$module.zincRenderer) {
        if (flag) {
          this.$module.zincRenderer.animate();
        } else {
          this.$module.zincRenderer.stopAnimate();
        }
      }
    },
    /**
     * @public
     *
     * Force the renderer to resize
     */
    forceResize: function () {
      if (this.$module.zincRenderer) {
        this.$module.zincRenderer.onWindowResize();
      }
    },
    syncControlCallback: function () {
      const payload = this.$module.NDCCameraControl.getPanZoom();
      if (this.tData.visible) {
        this.showRegionTooltip(this.tData.label, true, true);
      }
      /**
       * Emit when the scene has been transformed due to navigation,
       * only triggered during syncControl mode
       * @arg {Object} "Information on the navigation"
       */
      this.$emit("scaffold-navigated", payload);
    },
    /**
     * Rotate mode - "none", "horizontal", "vertical", "free" but
     * it will be ignored if flag is set to false.
     */
    toggleSyncControl: function (flag, rotateMode) {
      this.$module.toggleSyncControl(flag, rotateMode);
      this.$module.setSyncControlCallback(this.syncControlCallback);
    },

    /**
     * Set the markers for the scene.
     */
    setMarkers: function () {
      for (const [key, value] of Object.entries(this.markerLabels)) {
        this.setMarkerModeForObjectsWithName(key, value, "on");
      }
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

.message-icon {
  position: absolute;
  top: 15px;
  left: 37px;
  text-align: left;
  font-size: 25px;
  color: $warning;

  &:hover {
    cursor: pointer;
  }
}

.backgroundSpacer {
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 10px;
}

.warning-icon {
  color: $warning;
  top: 15px;
}

.latest-changesicon {
  color: $success;
  top: 45px;
}

.message-text {
  font-size: 15px;
  vertical-align: 5px;
}

:deep(.message-popper) {
  padding: 9px 10px;
  min-width: 150px;
  font-size: 12px;
  white-space: initial !important;
  text-align: initial;
  color: #fff;
}

#organsDisplayArea {
  &:focus {
    outline: none !important;
    border: 0px;
  }
}

.time-slider-container {
  text-align: left;
  position: absolute;
  right: 155px;
  width: calc(100% - 530px);
  bottom: 16px;
  transition: all 1s ease;
  outline: none;

  &.minimised {
    width: calc(40%);
  }

  &.left {
    right: 155px;
    width: calc(100% - 250px);
  }

  &.right {
    right: 8px;
    bottom: 54px;
  }
}

.slider-display-text {
  height: 20px;
  color: rgb(48, 49, 51);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
  padding-left: 8px;
  text-shadow: -1px -1px #fff, 1px -1px #fff, -1px 1px #fff, 1px -1px #fff;
}

.tab-content {
  display: flex;
  height: 34px;
  padding-top: 8px;
  font-size: 14px;
}

.tab-content {
  :deep(.el-slider__marks-text) {
    margin-top: 12px;
    margin-left: 8px;
    font-size: 10px;
  }
}

.tab-content {
  :deep(.el-slider__stop) {
    width: 10px;
    height: 10px;
    top: -1px;
    border: solid 1px $app-primary-color;
  }
}

.animation-data {
  margin-left: 8px;
  line-height: 26px;
  display: flex;

  :not(:first-child) {
    margin-left: 8px;
  }
  .purple {
    padding-left: 2px;
    color: $app-primary-color;
  }
}
.slider {
  margin-left: 30px;
  width: calc(100% - 88px);
  margin-top: -7px;

  :deep(.el-slider__runway) {
    height: 10px;
    margin: 14px 0;
  }

  :deep(.el-slider__button-wrapper) {
    top: -13px;
  }
}

.zoomOut {
  padding-left: 8px;
}

.fitWindow {
  padding-left: 8px;
}

:deep(.non-selectable) {
  user-select: none;
}

:deep(.background-popper.el-popover.el-popper) {
  padding: 5px 12px;
  background-color: #ffffff;
  border: 1px solid $app-primary-color;
  box-shadow: 0px 2px 12px 0px rgba(0, 0, 0, 0.06);
  height: 140px;
  min-width: 200px;
  .el-popper__arrow {
    &:before {
      border-color: $app-primary-color;
    }
  }
}

:deep(.background-popper.el-popover.el-popper.h-auto) {
  height: auto !important;
}

:deep(.open-map-popper.el-popover.el-popper) {
  padding-top: 5px;
  padding-bottom: 5px;
  background-color: #ffffff;
  border: 1px solid $app-primary-color;
  box-shadow: 0px 2px 12px 0px rgba(0, 0, 0, 0.06);
  min-width: 188px;
  .el-row ~ .el-row {
    margin-top: 8px;
  }

  .el-button {
    padding-top: 5px;
    padding-bottom: 5px;
    background: #f3e6f9;
    border-color: $app-primary-color;
    color: $app-primary-color;
  }

  .el-popper__arrow {
    &:before {
      border-color: $app-primary-color;
    }
  }
}

.settings-group {
  bottom: 16px;
  position: absolute;
  transition: all 1s ease;

  &.open {
    left: 322px;
  }

  &.close {
    left: 24px;
  }
}

.backgroundText {
  color: rgb(48, 49, 51);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
}

.backgroundChooser {
  display: flex;
  margin-top: 16px;
}

.backgroundChoice {
  width: 20px;
  height: 20px;
  border: 1px solid rgb(144, 147, 153);
  margin-left: 20px;

  &.active {
    border: 2px solid $app-primary-color;
  }

  &:hover {
    cursor: pointer;
  }

  &.white {
    background-color: white;
    margin-left: 10px;
  }

  &.black {
    background-color: black;
  }

  &.lightskyblue {
    background-color: lightskyblue;
  }
}

.icon-button {
  height: 24px !important;
  width: 24px !important;
  &.open-map-button {
    margin-bottom:4px;
  }

  &:hover {
    cursor: pointer;
  }

  &:focus {
    border: none;
    outline: none;
  }
}

.bottom-right-control {
  position: absolute;
  right: 16px;
  bottom: 16px;
}

.video-button {
  margin-left: 8px;
}

.time-slider-container {
  :deep(.el-tabs__header) {
    margin: 0px;
    border-bottom: 1px solid rgb(144, 147, 153);
    height: 24px;
  }

  .el-row {
    margin-bottom: 5px;
  }

  :deep(.el-tabs__content) {
    border-left: 1px solid rgb(144, 147, 153);
    border-bottom: 1px solid rgb(144, 147, 153);
    border-right: 1px solid rgb(144, 147, 153);
    border-radius: 0px 0px 4px 4px;
    background-color: white;
  }

  :deep(.el-tabs.el-tabs--top.el-tabs--card) {
    > .el-tabs__header {
      .el-tabs__nav {
        border: 1px solid rgb(144, 147, 153);
        border-bottom: none;
        border-radius: 4px 4px 0px 0px;
        background-color: white;
      }

      .el-tabs__item {
        height: 24px;
        line-height: 24px;
        padding: 0 8px !important;
        border-bottom: 1px solid;
        border-left: 1px solid rgb(144, 147, 153);
        &:first-child {
          border-left: none;
        }
        &.is-active {
          border-bottom: 1px solid white;
          color: rgb(48, 49, 51);
        }
        &:hover {
          color: $app-primary-color;
        }
      }
    }
  }
}

.scaffold-radio {
  :deep(label) {
    margin-right: 20px;
    &:last-child {
      margin-right: 0px;
    }
  }
  :deep(.el-radio__input) {
    &.is-checked {
      & + .el-radio__label {
        color: $app-primary-color;
      }
      .el-radio__inner {
        border-color: $app-primary-color;
        background: $app-primary-color;
      }
    }
    .el-radio__inner:hover {
      border-color: $app-primary-color;
    }
  }
}


:deep(.scaffold-popper.el-popper.el-popper) {
  padding: 6px 4px;
  font-size: 12px;
  color: rgb(48, 49, 51);
  background-color: #f3ecf6;
  border: 1px solid $app-primary-color;
  white-space: nowrap;
  min-width: unset;
  word-break: break-word;
  pointer-events: none;

  .el-popper__arrow {
    &:before {
      border-color: $app-primary-color;
      background-color: #f3ecf6;
    }
  }
}

:deep(.el-slider__button) {
  border: 2px solid $app-primary-color;
}

:deep(.el-slider__bar) {
  background-color: $app-primary-color;
  height: 10px;
}

:deep(.el-loading-spinner) {
  .path {
    stroke: $app-primary-color;
  }
  .el-loading-text {
    color: $app-primary-color;
  }
}


:deep(.popper-zoomout) {
  padding-right: 11px;

  .popper__arrow {
    left: 53px !important;
  }
}

.viewing-mode-title {
  font-size: 14px;
  font-weight: 600;
  color: $app-primary-color;
  margin: 8px;
  text-decoration: underline;
  cursor: pointer;
}

.viewing-mode-unselected {
  font-size: 11px;
  font-weight: 600;
  color: rgb(48, 49, 51);
  margin: 8px;
  opacity: 0.5;
  cursor: pointer;
}

.viewing-mode-description {
  font-size: 12px;
  color: rgb(48, 49, 51);
  text-align: left;
  padding-bottom: 4px;
  margin-left: 8px;
}

.scaffold-select-box {
  border-radius: 4px;
  border: 1px solid rgb(144, 147, 153);
  background-color: var(--white);
  font-weight: 500;
  color: rgb(48, 49, 51);

  &.speed {
    margin-left: 8px;
    width:50px!important;
    height: 24px;
    :deep(.el-select__wrapper) {
      padding: 0;
      min-height: 24px
    }
  }
}

:deep(.scaffold_viewer_dropdown) {
  min-width: 160px !important;
  .el-select-dropdown__item {
    white-space: nowrap;
    text-align: left;
    &.is-selected {
      color: $app-primary-color;
      font-weight: normal;
    }
  }
}


</style>

<style lang="scss">
canvas:focus {
  outline: none !important;
}

.scaffold-container {
  --el-color-primary: #8300BF;
  --el-color-primary-light-5: #cd99e5;
  --el-color-primary-light-7: #dab3ec;
  --el-color-primary-light-8: #e6ccf2
  --el-color-primary-light-9: #f3e6f9;
  height: 100%;
  width: 100%;
  position: relative;
}

.time-slider-tooltip {
  padding: 6px 4px !important;
  font-family: "Asap", sans-serif;
  font-size: 12px !important;
  color: rgb(48, 49, 51) !important;
  background-color: #f3ecf6 !important;
  border: 1px solid $app-primary-color !important;
  white-space: nowrap !important;
  min-width: unset !important;
  .el-popper__arrow {
    &:before {
      border-color: $app-primary-color!important;
      background-color: #f3ecf6!important;
    }
  }
}

.scaffold_viewer_dropdown .el-select-dropdown__item {
  white-space: nowrap;
  text-align: left;
  font-family: "Asap", sans-serif;
  &.is-selected {
    color: $app-primary-color;
    font-weight: normal;
  }
}

</style>
