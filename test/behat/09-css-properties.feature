@javascript
Feature: CSS properties from native browser state
  Scenario: Control values and connections survive background form replacement
    Given I am on "/example/10-css-controls.php"
    Then Flux should be ready
    And the CSS property "--flux-range" on "#range-control" should become "0.35"
    And the CSS property "--flux-select" on "#select-control" should become "2"
    And the CSS property "--flux-color" on "#colour-preview" should become "#326c85"
    When I change the element "input[name='volume']" to "75"
    And I change the element "select" to "3"
    And I change the element "input[type='color']" to "#885522"
    And I fill in "Display name" with "Ada"
    Then the CSS property "--flux-field-length" on "#name-control" should become "3"
    And the CSS property "--flux-field-dirty" on "#name-control" should become "1"
    When I press "Save preferences"
    Then I wait until the element "#saved-message" contains "Your preferences have been received."
    And the CSS property "--flux-range" on "#range-control" should become "0.75"
    And the CSS property "--flux-select" on "#select-control" should become "3"
    And the CSS property "--flux-color" on "#colour-preview" should become "#885522"
    And the CSS property "--flux-field-dirty" on "#name-control" should become "1"
    When I press "Reset preferences"
    Then the CSS property "--flux-field-clean" on "#name-control" should become "1"

  Scenario: Field flags reflect native constraint validation
    Given I am on "/example/10-css-controls.php"
    Then Flux should be ready
    And the CSS property "--flux-form-invalid-count" on "#preferences" should become "1"
    When I fill in "Display name" with "Ad"
    Then the CSS property "--flux-field-too-short" on "#name-control" should become "1"
    When I fill in "Display name" with "123"
    Then the CSS property "--flux-field-pattern-error" on "#name-control" should become "1"
    When I fill in "Display name" with "Ada"
    Then the CSS property "--flux-form-all-valid" on "#preferences" should become "1"
    And the CSS property "--flux-field-remaining" on "#name-control" should become "21"
    And the CSS property "--flux-field-filled-scalar" on "#name-control" should become "0.125"

  Scenario: Pointer coordinates are shared with a remote preview
    Given I am on "/example/09-css-geometry.php"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      const pad = document.querySelector('#pointer-pad');
      pad.scrollIntoView({block: 'center'});
      const rect = pad.getBoundingClientRect();
      window.dispatchEvent(new PointerEvent('pointermove', {clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2}));
      """
    Then the CSS property "--flux-pointer-x" on "#pointer-pad" should become "0.5"
    And the CSS property "--flux-pointer-y" on "#pointer-preview" should become "0.5"
    And the CSS example should satisfy:
      """
      Number(getComputedStyle(document.body).getPropertyValue('--flux-pointer-global-x')) > 0
      """

  Scenario: Local and viewport pixel coordinates feed generated text
    Given I am on "/example/09-css-geometry.php"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      const pad = document.querySelector('#pointer-pad');
      pad.scrollIntoView({block: 'center'});
      const rect = pad.getBoundingClientRect();
      window.pointerReadoutPosition = {x: rect.left + 50.25, y: rect.top + 60.75};
      window.dispatchEvent(new PointerEvent('pointermove', {clientX: pointerReadoutPosition.x, clientY: pointerReadoutPosition.y}));
      """
    Then the CSS property "--flux-pointer-x-px" on "#pointer-pad" should become "50.25"
    And the CSS property "--flux-pointer-y-px" on "#pointer-preview" should become "60.75"
    And the CSS example should satisfy:
      """
      (() => {
        const local = getComputedStyle(document.querySelector('.pointer-readout'), '::after');
        const viewport = getComputedStyle(document.querySelector('.viewport-pointer-readout'), '::after');
        return local.counterReset === 'x 50 y 61'
          && viewport.counterReset === `x ${Math.round(pointerReadoutPosition.x)} y ${Math.round(pointerReadoutPosition.y)}`
          && local.content === 'counter(x) "px, " counter(y) "px"'
          && viewport.content === local.content;
      })()
      """

  Scenario: Size and truncation follow actual layout changes
    Given I am on "/example/09-css-geometry.php"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      const box = document.querySelector('#size-box');
      box.scrollIntoView({block: 'center'});
      box.style.width = '300px';
      """
    Then the CSS property "--flux-size-x" on "#size-box" should become "300"
    When I run this CSS example interaction:
      """
      const text = document.querySelector('#truncated-text');
      text.scrollIntoView({block: 'center'});
      text.style.width = '150px';
      """
    Then the CSS property "--flux-truncated-x" on "#truncated-text" should become "1"
    When I run this CSS example interaction:
      """
      document.querySelector('#truncated-text').textContent = 'Short';
      """
    Then the CSS property "--flux-truncated" on "#truncated-text" should become "0"

  Scenario: First visibility persists after scrolling away
    Given I am on "/example/09-css-geometry.php"
    Then Flux should be ready
    And the CSS property "--flux-visible" on "#visibility-panel" should become "0"
    When I run this CSS example interaction:
      """
      document.querySelector('#visibility-panel').scrollIntoView({block: 'center'});
      """
    Then the CSS property "--flux-visible" on "#visibility-panel" should become "1"
    And the CSS property "--flux-first-visible" on "#visibility-panel" should become "1"
    When I run this CSS example interaction:
      """
      window.scrollTo(0, 0);
      """
    Then the CSS property "--flux-visible" on "#visibility-panel" should become "0"
    And the CSS property "--flux-first-visible" on "#visibility-panel" should become "1"

  Scenario: Image and video palettes use real canvas pixels
    Given I am on "/example/11-css-palette.php"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      document.querySelector('#image-palette').scrollIntoView({block: 'center'});
      """
    Then the CSS example should satisfy:
      """
      ['', '-accent', '-dark', '-light', '-average'].every(suffix => /^#[0-9a-f]{6}$/.test(getComputedStyle(document.querySelector('#image-palette')).getPropertyValue('--flux-palette' + suffix).trim()))
      """
    When I run this CSS example interaction:
      """
      const video = document.querySelector('video');
      video.scrollIntoView({block: 'center'});
      video.play();
      window.initialPalette = getComputedStyle(document.querySelector('#video-palette')).getPropertyValue('--flux-palette');
      """
    Then the CSS example should satisfy:
      """
      /^#[0-9a-f]{6}$/.test(getComputedStyle(document.querySelector('#video-palette')).getPropertyValue('--flux-palette').trim()) && getComputedStyle(document.querySelector('#video-palette')).getPropertyValue('--flux-palette') !== window.initialPalette
      """

  Scenario: Removing a connection restores an author's important declaration
    Given I am on "/example/10-css-controls.php"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      const output = document.createElement('output');
      output.id = 'owned-property';
      output.style.setProperty('--flux-range', '.9', 'important');
      document.body.append(output);
      document.querySelector('#range-control').dataset.flux = 'flux-range (flux-range@#owned-property)';
      """
    Then the CSS property "--flux-range" on "#owned-property" should become "0.35"
    When I run this CSS example interaction:
      """
      document.querySelector('#range-control').dataset.flux = 'flux-range';
      """
    Then the CSS example should satisfy:
      """
      document.querySelector('#owned-property').style.getPropertyValue('--flux-range') === '.9' && document.querySelector('#owned-property').style.getPropertyPriority('--flux-range') === 'important'
      """
