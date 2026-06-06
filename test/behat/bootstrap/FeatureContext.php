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
	 * @Then the element :selector should have value :value
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
	  const pointerOffsetY = itemRect.top + itemRect.height / 2 - startY;
	  const siblings = [...container.children].filter(child => child !== item);
	  const targetIndex = Math.max(0, Math.min(siblings.length, $encodedPosition - 1));
	  const before = siblings[targetIndex] ?? null;
	  const previous = siblings[targetIndex - 1] ?? null;
	  const beforeMid = before
	    ? before.getBoundingClientRect().top + before.getBoundingClientRect().height / 2
	    : container.getBoundingClientRect().bottom;
	  const previousMid = previous
	    ? previous.getBoundingClientRect().top + previous.getBoundingClientRect().height / 2
	    : container.getBoundingClientRect().top;
	  const targetItemCenterY = (beforeMid + previousMid) / 2;
	  const targetPointerY = targetItemCenterY - pointerOffsetY;
	  const x = handleRect.left + handleRect.width / 2;
	  const eventOptions = {
	    bubbles: true,
	    cancelable: true,
	    pointerId: 1,
	    pointerType: "touch",
	    isPrimary: true,
	    button: 0,
	    buttons: 1,
	    clientX: x,
	  };

	  handle.dispatchEvent(new PointerEvent("pointerdown", {...eventOptions, clientY: startY}));
	  document.dispatchEvent(new PointerEvent("pointermove", {...eventOptions, clientY: targetPointerY}));
	  document.dispatchEvent(new PointerEvent("pointerup", {...eventOptions, buttons: 0, clientY: targetPointerY}));
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
