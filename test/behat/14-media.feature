@javascript
Feature: Media example inputs
  Scenario: A local image replaces the preview and its palette
    Given I am on "/?page=media"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      document.querySelector('#image-palette-demo').scrollIntoView({block: 'center'});
      var files = new DataTransfer();
      files.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path fill="#ff0000" d="M0 0h32v32H0z"/></svg>'], 'red.svg', {type: 'image/svg+xml'}));
      var picker = document.querySelector('#palette-image-file');
      picker.files = files.files;
      picker.dispatchEvent(new Event('change', {bubbles: true}));
      """
    Then the CSS example should satisfy:
      """
      document.querySelector('#image-palette-demo img').src.startsWith('blob:')
      && document.querySelector('#image-palette-demo img').alt === 'Selected image: red.svg'
      && getComputedStyle(document.querySelector('#image-palette-demo figure')).getPropertyValue('--flux-palette').trim() === '#ff0000'
      """
