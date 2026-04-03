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
