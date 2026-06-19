<?php

use Behat\Behat\Tester\Exception\PendingException;
use Behat\Gherkin\Node\PyStringNode;
use Behat\Mink\Element\NodeElement;
use Behat\Mink\Exception\ExpectationException;
use Behat\MinkExtension\Context\MinkContext;

class FeatureContext extends MinkContext {
	private DateTime $rememberedTime;

	/**
	 * @When I fill the element :selector with:
	 */
	public function iFillTheElementWith(string $selector, PyStringNode $value):void {
		$this->fillCssElement($selector, (string)$value);
	}

	/**
	 * @When I fill the element :selector with :value
	 */
	public function iFillTheElementWithValue(string $selector, string $value):void {
		$this->fillCssElement($selector, $value);
	}

	/**
	 * @When I change the element :selector to :value
	 */
	public function iChangeTheElementTo(string $selector, string $value):void {
		$escapedSelector = json_encode($selector, JSON_THROW_ON_ERROR);
		$escapedValue = json_encode($value, JSON_THROW_ON_ERROR);
		$script = <<<JS
	(() => {
	  const element = document.querySelector($escapedSelector);
	  if(!element) {
	    throw new Error("Could not find element: " + $escapedSelector);
	  }

	  element.focus();
	  element.value = $escapedValue;
	  element.dispatchEvent(new Event("input", {bubbles: true}));
	  element.dispatchEvent(new Event("change", {bubbles: true}));
	  element.blur();
	})()
	JS;

		$this->getSession()->executeScript($script);
	}

	/**
	 * @When I press Enter in the element :selector
	 */
	public function iPressEnterInTheElement(string $selector):void {
		$escapedSelector = json_encode($selector, JSON_THROW_ON_ERROR);
		$script = <<<JS
	(() => {
	  const element = document.querySelector($escapedSelector);
	  if(!element) {
	    throw new Error("Could not find element: " + $escapedSelector);
	  }

	  const form = element.form;
	  if(!(form instanceof HTMLFormElement)) {
	    throw new Error("Element does not belong to a form: " + $escapedSelector);
	  }

	  const eventOptions = {
	    key: "Enter",
	    code: "Enter",
	    bubbles: true,
	    cancelable: true,
	  };
	  const button = form.querySelector("button[type='submit'], button:not([type]), input[type='submit']");
	  element.focus();
	  element.dispatchEvent(new KeyboardEvent("keydown", eventOptions));
	  element.dispatchEvent(new KeyboardEvent("keyup", eventOptions));
	  form.requestSubmit(button);
	})()
	JS;

		$this->getSession()->executeScript($script);
	}

	/**
	 * @Then /^the element "([^"]+)" should have value "(.*)"$/
	 */
	public function theElementShouldHaveValue(string $selector, string $value):void {
		$element = $this->findCssElement($selector);
		$actualValue = (string)$element->getValue();

		if($actualValue !== $value) {
			throw new ExpectationException(
				sprintf('Expected element "%s" to have value "%s", got "%s".', $selector, $value, $actualValue),
				$this->getSession(),
			);
		}
	}

	/**
	 * @When I drag the item with id :id to position :position in :selector
	 */
	public function iDragTheItemWithIdToPositionIn(string $id, int $position, string $selector):void {
		$escapedSelector = json_encode($selector, JSON_THROW_ON_ERROR);
		$escapedId = json_encode($id, JSON_THROW_ON_ERROR);
		$encodedPosition = json_encode($position, JSON_THROW_ON_ERROR);
		$script = <<<JS
	(() => {
	  const id = $escapedId;
	  const container = document.querySelector($escapedSelector);
	  if(!container) {
	    throw new Error("Could not find container: " + $escapedSelector);
	  }

	  const item = container.querySelector('[data-id="' + CSS.escape(id) + '"]');
	  if(!item) {
	    throw new Error("Could not find item with data-id: " + id);
	  }

	  const handle = item.querySelector(".drag-handle");
	  if(!handle) {
	    throw new Error("Could not find drag handle for item: " + id);
	  }

	  const itemRect = item.getBoundingClientRect();
	  const handleRect = handle.getBoundingClientRect();
	  const startY = handleRect.top + handleRect.height / 2;
	  const startX = handleRect.left + handleRect.width / 2;
	  const pointerOffsetY = itemRect.top + itemRect.height / 2 - startY;
	  const pointerOffsetX = itemRect.left + itemRect.width / 2 - startX;
	  const siblings = [...container.children].filter(child => child !== item);
	  const targetIndex = Math.max(0, Math.min(siblings.length, $encodedPosition - 1));
	  const before = siblings[targetIndex] ?? null;
	  const previous = siblings[targetIndex - 1] ?? null;
	  const rects = siblings.map(child => child.getBoundingClientRect());
	  const lefts = rects.map(rect => rect.left);
	  const tops = rects.map(rect => rect.top);
	  const horizontal = siblings.length > 1
	    && Math.max(...lefts) - Math.min(...lefts) > Math.max(...tops) - Math.min(...tops);
	  const beforeX = before
	    ? before.getBoundingClientRect().left + before.getBoundingClientRect().width / 2
	    : container.getBoundingClientRect().right;
	  const previousX = previous
	    ? previous.getBoundingClientRect().left + previous.getBoundingClientRect().width / 2
	    : container.getBoundingClientRect().left;
	  const beforeMid = before
	    ? before.getBoundingClientRect().top + before.getBoundingClientRect().height / 2
	    : container.getBoundingClientRect().bottom;
	  const previousMid = previous
	    ? previous.getBoundingClientRect().top + previous.getBoundingClientRect().height / 2
	    : container.getBoundingClientRect().top;
	  const targetItemCenterY = (beforeMid + previousMid) / 2;
	  const targetItemCenterX = (beforeX + previousX) / 2;
	  const targetPointerY = targetItemCenterY - pointerOffsetY;
	  const targetPointerX = horizontal
	    ? targetItemCenterX - pointerOffsetX
	    : startX;
	  const eventOptions = {
	    bubbles: true,
	    cancelable: true,
	    pointerId: 1,
	    pointerType: "touch",
	    isPrimary: true,
	    button: 0,
	    buttons: 1,
	  };

	  handle.dispatchEvent(new PointerEvent("pointerdown", {...eventOptions, clientX: startX, clientY: startY}));
	  document.dispatchEvent(new PointerEvent("pointermove", {...eventOptions, clientX: targetPointerX, clientY: targetPointerY}));
	  document.dispatchEvent(new PointerEvent("pointerup", {...eventOptions, buttons: 0, clientX: targetPointerX, clientY: targetPointerY}));
	})()
	JS;

		$this->getSession()->executeScript($script);
	}

	/**
	 * @When I drag the item with id :id from :sourceSelector to position :position in :targetSelector
	 */
	public function iDragTheItemWithIdFromToPositionIn(string $id, string $sourceSelector, int $position, string $targetSelector):void {
		$escapedSourceSelector = json_encode($sourceSelector, JSON_THROW_ON_ERROR);
		$escapedTargetSelector = json_encode($targetSelector, JSON_THROW_ON_ERROR);
		$escapedId = json_encode($id, JSON_THROW_ON_ERROR);
		$encodedPosition = json_encode($position, JSON_THROW_ON_ERROR);
		$script = <<<JS
	(() => {
	  const id = $escapedId;
	  const sourceContainer = document.querySelector($escapedSourceSelector);
	  const targetContainer = document.querySelector($escapedTargetSelector);
	  if(!sourceContainer) {
	    throw new Error("Could not find source container: " + $escapedSourceSelector);
	  }
	  if(!targetContainer) {
	    throw new Error("Could not find target container: " + $escapedTargetSelector);
	  }

	  const item = sourceContainer.querySelector('[data-id="' + CSS.escape(id) + '"]');
	  if(!item) {
	    throw new Error("Could not find item with data-id: " + id);
	  }

	  const handle = item.querySelector(".drag-handle");
	  if(!handle) {
	    throw new Error("Could not find drag handle for item: " + id);
	  }

	  const itemRect = item.getBoundingClientRect();
	  const handleRect = handle.getBoundingClientRect();
	  const targetRect = targetContainer.getBoundingClientRect();
	  const startY = handleRect.top + handleRect.height / 2;
	  const startX = handleRect.left + handleRect.width / 2;
	  const pointerOffsetY = itemRect.top + itemRect.height / 2 - startY;
	  const pointerOffsetX = itemRect.left + itemRect.width / 2 - startX;
	  const siblings = [...targetContainer.children].filter(child => child !== item);
	  const targetIndex = Math.max(0, Math.min(siblings.length, $encodedPosition - 1));
	  const before = siblings[targetIndex] ?? null;
	  const previous = siblings[targetIndex - 1] ?? null;
	  const rects = siblings.map(child => child.getBoundingClientRect());
	  const lefts = rects.map(rect => rect.left);
	  const tops = rects.map(rect => rect.top);
	  const horizontal = siblings.length > 1
	    && Math.max(...lefts) - Math.min(...lefts) > Math.max(...tops) - Math.min(...tops);
	  const beforeX = before
	    ? before.getBoundingClientRect().left + before.getBoundingClientRect().width / 2
	    : targetRect.right;
	  const previousX = previous
	    ? previous.getBoundingClientRect().left + previous.getBoundingClientRect().width / 2
	    : targetRect.left;
	  const beforeMid = before
	    ? before.getBoundingClientRect().top + before.getBoundingClientRect().height / 2
	    : targetRect.bottom;
	  const previousMid = previous
	    ? previous.getBoundingClientRect().top + previous.getBoundingClientRect().height / 2
	    : targetRect.top;
	  const targetItemCenterY = (beforeMid + previousMid) / 2;
	  const targetItemCenterX = (beforeX + previousX) / 2;
	  const targetPointerY = targetItemCenterY - pointerOffsetY;
	  const targetPointerX = horizontal
	    ? targetItemCenterX - pointerOffsetX
	    : targetRect.left + Math.min(20, targetRect.width / 2);
	  const eventOptions = {
	    bubbles: true,
	    cancelable: true,
	    pointerId: 1,
	    pointerType: "touch",
	    isPrimary: true,
	    button: 0,
	    buttons: 1,
	  };

	  handle.dispatchEvent(new PointerEvent("pointerdown", {
	    ...eventOptions,
	    clientX: startX,
	    clientY: startY,
	  }));
	  document.dispatchEvent(new PointerEvent("pointermove", {
	    ...eventOptions,
	    clientX: targetPointerX,
	    clientY: targetPointerY,
	  }));
	  document.dispatchEvent(new PointerEvent("pointerup", {
	    ...eventOptions,
	    buttons: 0,
	    clientX: targetPointerX,
	    clientY: targetPointerY,
	  }));
	})()
	JS;

		$this->getSession()->executeScript($script);
	}

	/**
	 * @Then the items in :selector should be ordered :expectedOrder
	 */
	public function theItemsInShouldBeOrdered(string $selector, string $expectedOrder):void {
		$escapedSelector = json_encode($selector, JSON_THROW_ON_ERROR);
		$escapedExpectedOrder = json_encode($expectedOrder, JSON_THROW_ON_ERROR);
		$condition = <<<JS
	(() => {
	  const container = document.querySelector($escapedSelector);
	  if(!container) {
	    return false;
	  }

	  const actualOrder = [...container.children]
	    .map(child => child.dataset.id)
	    .filter(id => id !== undefined)
	    .join(",");
	  return actualOrder === $escapedExpectedOrder;
	})()
	JS;

		$this->waitForCondition($condition, sprintf('Timed out waiting for "%s" to be ordered "%s".', $selector, $expectedOrder));
	}

	/**
	 * @Then I wait until the element :selector contains :text
	 */
	public function iWaitUntilTheElementContains(string $selector, string $text):void {
		$escapedSelector = json_encode($selector, JSON_THROW_ON_ERROR);
		$escapedText = json_encode($text, JSON_THROW_ON_ERROR);
		$condition = <<<JS
	(() => {
	  const element = document.querySelector($escapedSelector);
	  return !!element && element.textContent.includes($escapedText);
	})()
	JS;

		$this->waitForCondition($condition, sprintf('Timed out waiting for "%s" to contain "%s".', $selector, $text));
	}

	/**
	 * @Then I wait until I do not see :text
	 */
	public function iWaitUntilIDoNotSee(string $text):void {
		$escapedText = json_encode($text, JSON_THROW_ON_ERROR);
		$condition = <<<JS
	(() => !document.body.textContent.includes($escapedText))()
	JS;

		$this->waitForCondition($condition, sprintf('Timed out waiting for "%s" to disappear.', $text));
	}

	/**
	 * @Then I wait until the element :selector changes
	 */
	public function iWaitUntilTheElementChanges(string $selector):void {
		$element = $this->findCssElement($selector);
		$initialText = (string)$element->getText();
		$escapedSelector = json_encode($selector, JSON_THROW_ON_ERROR);
		$escapedText = json_encode($initialText, JSON_THROW_ON_ERROR);
		$condition = <<<JS
	(() => {
	  const element = document.querySelector($escapedSelector);
	  return !!element && element.textContent !== $escapedText;
	})()
	JS;

		$this->waitForCondition($condition, sprintf('Timed out waiting for "%s" to change.', $selector));
	}

	/**
	 * @Then Flux should be ready
	 */
	public function fluxShouldBeReady():void {
		$this->waitForCondition(
			'document.getElementById("flux-style") !== null',
			'Timed out waiting for Flux to initialise on the page.',
		);
	}

	/**
	 * @When /^I remember the time from the page$/
	 */
	public function iRememberTheTimeFromThePage() {
		$time = $this->findCssElement("time");
		$timeText = $time->getText();
		$this->rememberedTime = new DateTime($timeText);
	}

	/**
	 * @Then the remembered time should have advanced :numSeconds seconds
	 */
	public function theRememberedTimeShouldHaveAdvancedSeconds(int $numSeconds) {
		$expected = $this->rememberedTime->add(new DateInterval("PT" . $numSeconds . "S"));
		$expectedDateString = $expected->format("Y-m-d H:i:s");
		$actualDateString = date("Y-m-d H:i:s");

		if($expectedDateString !== $actualDateString) {
			throw new ExpectationException(
				sprintf('Expected time to be "%s", got "%s".', $expectedDateString, $actualDateString),
				$this->getSession(),
			);
		}
	}

	/**
	 * @Then I wait :numSeconds seconds
	 */
	public function iWaitSeconds(int $numSeconds) {
		sleep($numSeconds);
	}

	private function fillCssElement(string $selector, string $value):void {
		$element = $this->findCssElement($selector);
		$element->setValue($value);
	}

	private function findCssElement(string $selector):NodeElement {
		$element = $this->getSession()->getPage()->find('css', $selector);
		if(!$element) {
			throw new ExpectationException(
				sprintf('Could not find element matching CSS selector "%s".', $selector),
				$this->getSession(),
			);
		}

		return $element;
	}

	private function waitForCondition(string $condition, string $errorMessage, int $timeoutMs = 5000):void {
		$result = $this->getSession()->wait($timeoutMs, $condition);
		if(!$result) {
			throw new ExpectationException($errorMessage, $this->getSession());
		}
	}
}
