export default function generateHelpMenu (code, isWhiteTheme, slotName) {
    const { layoutContent } = code
    const helpMenuKey = 'topHelpMenuList'
    code.dataTemplate(helpMenuKey, JSON.stringify(layoutContent.helpMenuList || []))

    return `<bk-popover v-if="${helpMenuKey}.length > 0"  class="nav-help-menu" theme="light navigation-message empty-padding"  placement="bottom-end" :arrow="false" :distance="5"  :z-index="999" :tippy-options="{ hideOnClick: false }">
                <div class="nav-help-icon" :class="{ 'white-nav-help-icon': ${isWhiteTheme} }">
                    <svg class="bk-icon" style="width: 1em; height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg">
                        <path d="M32,4C16.5,4,4,16.5,4,32c0,3.6,0.7,7.1,2,10.4V56c0,1.1,0.9,2,2,2h13.6C36,63.7,52.3,56.8,58,42.4S56.8,11.7,42.4,6C39.1,4.7,35.6,4,32,4z M31.3,45.1c-1.7,0-3-1.3-3-3s1.3-3,3-3c1.7,0,3,1.3,3,3S33,45.1,31.3,45.1z M36.7,31.7c-2.3,1.3-3,2.2-3,3.9v0.9H29v-1c-0.2-2.8,0.7-4.4,3.2-5.8c2.3-1.4,3-2.2,3-3.8s-1.3-2.8-3.3-2.8c-1.8-0.1-3.3,1.2-3.5,3c0,0.1,0,0.1,0,0.2h-4.8c0.1-4.4,3.1-7.4,8.5-7.4c5,0,8.3,2.8,8.3,6.9C40.5,28.4,39.2,30.3,36.7,31.7z"></path>
                    </svg>
                </div>
                <template ${slotName}>
                    <ul class="help-menu-list">
                        <li class="help-menu-item" v-for="helpMenu in ${helpMenuKey}" :key="helpMenu.id" @click="goToPage(helpMenu)">
                        {{helpMenu.name}}
                        </li>
                    </ul>
                </template>
            </bk-popover>`
}
